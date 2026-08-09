// data/bus.js 생성기 — 부산버스정보시스템 OpenAPI 에서 장소별 경유 노선을 뽑는다.
//   node tools/mkbus.js            (응답은 임시폴더에 캐시되므로 재실행은 빠르다)
//   node tools/mkbus.js --fresh    캐시 무시하고 다시 받기
// 서비스키는 저장소 루트의 .apikey (gitignore 됨) 에서 읽는다.
//
// 흐름: 정류소 전체(좌표) + 노선 전체 + 노선별 경유정류소 → POI 반경 안 정류소를 지나는 노선 집합.
// 배포물에는 장소별 노선 번호만 남는다(원본 수천 행은 개발 시점에만 쓴다).
const fs = require('fs'), path = require('path'), os = require('os');
const dir = path.join(__dirname, '..');
const BASE = 'https://apis.data.go.kr/6260000/BusanBIMS';
const RADIUS = 0.5;    // 정류소를 그 장소 것으로 볼 반경(km)
const FAR = 1.6;       // 반경 안에 노선이 없으면 여기까지 넓힌다(태종대·공항 등 외곽. d 로 실거리가 남는다)
const MAX_PER_POI = 8; // 장소당 남길 노선 수 상한
const CACHE = path.join(os.tmpdir(), 'busan-bims');
const fresh = process.argv.includes('--fresh');

const keyFile = path.join(dir, '.apikey');
if (!fs.existsSync(keyFile)) { console.error('.apikey 가 없다. BUSAN_BIMS_KEY=... 한 줄을 넣어라.'); process.exit(1); }
const KEY = (fs.readFileSync(keyFile, 'utf8').match(/^BUSAN_BIMS_KEY=(.+)$/m) || [])[1];
if (!KEY) { console.error('.apikey 에서 BUSAN_BIMS_KEY 를 못 찾았다.'); process.exit(1); }

fs.mkdirSync(CACHE, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(op, params, tag) {
  const f = path.join(CACHE, tag + '.xml');
  if (!fresh && fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
  const q = new URLSearchParams({ ...params, numOfRows: params.numOfRows || 1000 });
  const url = `${BASE}/${op}?serviceKey=${KEY}&${q}`;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(url);
      const x = await r.text();
      if (x.includes('NORMAL SERVICE')) { fs.writeFileSync(f, x); return x; }
      if (x.includes('LIMITED_NUMBER_OF_SERVICE')) { console.error('일일 호출 한도 초과'); process.exit(1); }
    } catch (e) { /* 재시도 */ }
    await sleep(500 * (t + 1));
  }
  return '';
}
// 의존성 없이 <item> 만 긁는다
const items = xml => (xml.match(/<item>[\s\S]*?<\/item>/g) || []).map(s => {
  const o = {}; for (const m of s.matchAll(/<(\w+)>([^<]*)<\/\1>/g)) o[m[1]] = m[2]; return o;
});
const km = (a, b) => {
  const R = 6371, d1 = (b.lat - a.lat) * Math.PI / 180, d2 = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(d1 / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(d2 / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

(async () => {
  // 1) 정류소 전체 (좌표)
  const stops = {};
  for (let p = 1; p <= 12; p++) {
    const xml = await get('busStopList', { pageNo: p }, `stops_${p}`);
    const it = items(xml); if (!it.length) break;
    it.forEach(s => { if (s.gpsy && s.gpsx) stops[s.bstopid] = { lat: +s.gpsy, lng: +s.gpsx, nm: s.bstopnm }; });
    process.stderr.write(`\r정류소 ${Object.keys(stops).length}개`);
  }
  console.error(`\r정류소 ${Object.keys(stops).length}개 수집`);

  // 2) 노선 전체
  const lines = items(await get('busInfo', {}, 'lines'));
  console.error(`노선 ${lines.length}개`);

  // 3) 노선별 경유 정류소 → 정류소ID -> 노선번호 집합
  const byStop = {};
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const xml = await get('busInfoByRouteId', { lineid: L.lineid }, `r_${L.lineid}`);
    items(xml).forEach(s => {
      const id = s.nodeid; if (!id) return;
      (byStop[id] = byStop[id] || new Set()).add(L.buslinenum);
    });
    if (i % 20 === 0) process.stderr.write(`\r노선 ${i + 1}/${lines.length}`);
  }
  console.error(`\r노선 ${lines.length}개 경유정류소 수집 완료`);

  // 4) 장소별 노선 — 반경 안 정류소를 지나는 노선을, 가까운 정류소 순으로
  global.window = global;
  eval(fs.readFileSync(path.join(dir, 'data/busan.js'), 'utf8'));
  const R = REGIONS.busan;
  const stopList = Object.entries(stops).map(([id, s]) => ({ id, ...s }));
  const near = {};
  const within = (p, r) => stopList.map(s => ({ s, d: km(p, s) })).filter(x => x.d <= r).sort((a, b) => a.d - b.d);
  const pick = hit => {
    const out = [];
    for (const { s } of hit) for (const ln of (byStop[s.id] || [])) if (!out.includes(ln)) out.push(ln);
    return out;
  };
  const routesFor = p => {
    // 노선이 잡힌 가장 가까운 정류소를 대표로 삼는다. 반경 안이 비면 FAR 까지 넓힌다.
    let hit = within(p, RADIUS);
    if (!pick(hit).length) hit = within(p, FAR);
    const routes = pick(hit);
    const head = hit.find(x => (byStop[x.s.id] || new Set()).size);
    return { routes: routes.slice(0, MAX_PER_POI), stop: head ? head.s.nm : null, km: head ? head.d : null };
  };
  R.pois.forEach(p => { const r = routesFor(p); if (r.routes.length) near[p.id] = r; });
  const starts = {};
  R.starts.forEach(s => { const r = routesFor(s); if (r.routes.length) starts[s.id] = r; });

  const meta = {};
  lines.forEach(L => { meta[L.buslinenum] = { t: L.bustype, h: L.headway, f: L.firsttime, e: L.endtime }; });
  const used = new Set([...Object.values(near), ...Object.values(starts)].flatMap(v => v.routes));
  const slim = {}; [...used].sort().forEach(n => { if (meta[n]) slim[n] = meta[n]; });

  const q = JSON.stringify;
  let out = `// 부산 시내버스 — 장소별 경유 노선. 두 장소의 교집합이 곧 "직통 노선"이다.
// 출처: 공공데이터포털 「부산광역시_부산버스정보시스템」 OpenAPI. tools/mkbus.js 로 생성한다.
//   near[poiId] = { r:[노선번호...], s:'가장 가까운 정류장', d:거리km }  (반경 ${RADIUS}km, 최대 ${MAX_PER_POI}개)
//   lines[노선번호] = { t:차종, h:배차(분), f:첫차, e:막차 }
// 실제 경로 탐색이 아니라 "이 두 곳을 다 지나는 노선"일 뿐이다 — 환승 안내는 못 한다.
window.REGIONS = window.REGIONS || {};
REGIONS.busan.bus = {
  lines: {
`;
  out += Object.entries(slim).map(([n, m]) =>
    `    ${q(n)}: { t: ${q(m.t)}, h: ${q(m.h || '')}, f: ${q(m.f || '')}, e: ${q(m.e || '')} }`).join(',\n');
  out += `\n  },\n  near: {\n`;
  const row = (k, v) => `    ${q(k)}: { r: [${v.routes.map(q).join(', ')}], s: ${q(v.stop)}, d: ${v.km.toFixed(2)} }`;
  out += Object.entries(near).map(([k, v]) => row(k, v)).join(',\n');
  out += `\n  },\n  starts: {\n`;
  out += Object.entries(starts).map(([k, v]) => row(k, v)).join(',\n');
  out += `\n  }\n};\n`;
  fs.writeFileSync(path.join(dir, 'data/bus.js'), out);
  console.error(`data/bus.js 생성 — 장소 ${Object.keys(near).length}곳 / 출발지 ${Object.keys(starts).length}곳 / 노선 ${Object.keys(slim).length}개`);
})();
