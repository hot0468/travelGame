// data/fukuoka-subway.js 생성기 — 후쿠오카시 지하철 GTFS 에서 노선·역·역간 소요시간을 뽑는다.
//   node tools/mksubway-fukuoka.js          (원본은 임시폴더에 캐시된다)
//   node tools/mksubway-fukuoka.js --fresh  캐시 무시하고 다시 받기
//
// 출처: kuwayamamasayuki/GTFS-FukuokaCitySubway (MIT).
//   후쿠오카시 지하철 시각표를 GTFS 로 옮긴 것이다. **공식 배포가 아니라 개인이 만든 비공식
//   데이터**다 — MIT 라 이용에 제약은 없지만, 다이어 개정을 바로 못 따라갈 수 있다.
//   (일본 GTFS 저장소 api.gtfs-data.jp 에는 후쿠오카시 지하철·니시테츠 버스가 없다.
//    후쿠오카현 피드 40개는 전부 주변 시·정촌 커뮤니티버스라 게임 장소와 안 맞는다.)
//
// 부산(data/subway.js)과 같은 형식으로 낸다:
//   lines[] = { id, name, color, st: [역명...] }
//   pos{}   = 역명 → [위도, 경도]
//   gap{}   = 노선id → [[거리km, 소요초], ...]   i번째가 st[i-1] → st[i]
//
// GTFS 에는 역간 거리(shape_dist_traveled)가 있지만 노선 시점 기준 누계라 좌표로 직접 잰다 —
// index.html 의 km() 와 같은 방식이어야 다른 계산과 어긋나지 않는다.
const fs = require('fs'), path = require('path'), os = require('os');
const dir = path.join(__dirname, '..');
const BASE = 'https://raw.githubusercontent.com/kuwayamamasayuki/GTFS-FukuokaCitySubway/HEAD/dist/';
const CACHE = path.join(os.tmpdir(), 'fukuoka-subway');
const fresh = process.argv.includes('--fresh');
const UA = { 'User-Agent': 'travelGame/1.0 (https://github.com/hot0468/travelGame)' };
const FILES = ['stops', 'routes', 'trips', 'stop_times'];

// 노선 이름을 한국어로. 게임 UI 가 한국어라 원문 그대로 두면 읽기 어렵다.
const LINE_KO = { '空港線': '공항선', '箱崎線': '하코자키선', '七隈線': '나나쿠마선' };
// 역 이름도 한국어로. 게임에 쓰이는 장소 주변 역만 정확히 적고, 나머지는 원문을 남긴다.
const STA_KO = {
  '姪浜': '메이노하마', '室見': '무로미', '藤崎': '후지사키', '西新': '니시진',
  '唐人町': '도진마치', '大濠公園': '오호리공원', '赤坂': '아카사카', '天神': '텐진',
  '中洲川端': '나카스카와바타', '祇園': '기온', '博多': '하카타', '東比恵': '히가시히에',
  '福岡空港': '후쿠오카공항', '呉服町': '고후쿠마치', '千代県庁口': '지요겐초구치',
  '馬出九大病院前': '마이다시큐다이뵤인마에', '箱崎宮前': '하코자키미야마에',
  '箱崎九大前': '하코자키큐다이마에', '貝塚': '가이즈카',
  '橋本': '하시모토', '次郎丸': '지로마루', '賀茂': '가모', '野芥': '노케',
  '梅林': '우메바야시', '福大前': '후쿠다이마에', '七隈': '나나쿠마', '金山': '가나야마',
  '茶山': '자야마', '別府': '벳푸', '六本松': '롯폰마쓰', '桜坂': '사쿠라자카',
  '薬院大通': '야쿠인오도리', '薬院': '야쿠인', '渡辺通': '와타나베도리',
  '天神南': '텐진미나미', '櫛田神社前': '구시다진자마에',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function grab(name) {
  const f = path.join(CACHE, name + '.txt');
  if (!fresh && fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(BASE + name + '.txt', { headers: UA, signal: AbortSignal.timeout(120000) });
      if (r.ok) { const x = await r.text(); fs.writeFileSync(f, x); return x; }
    } catch (e) { /* 재시도 */ }
    await sleep(1000 * (t + 1));
  }
  return null;
}
// GTFS 는 쉼표 구분에 따옴표 인용을 쓴다. 역명에 쉼표가 들어갈 수 있어 그냥 split 하면 깨진다.
function parseCSV(text) {
  const rows = text.trim().split(/\r?\n/);
  const cut = line => {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur); return out;
  };
  const head = cut(rows[0]);
  return rows.slice(1).map(l => { const v = cut(l), o = {}; head.forEach((k, i) => o[k] = v[i]); return o; });
}

const RAD = 6371, rd = d => d * Math.PI / 180;
const km = (a, b) => {
  const dl = rd(b[0] - a[0]), dg = rd(b[1] - a[1]);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(rd(a[0])) * Math.cos(rd(b[0])) * Math.sin(dg / 2) ** 2;
  return 2 * RAD * Math.asin(Math.sqrt(h));
};
const secOf = t => { const [h, m, s] = t.split(':').map(Number); return h * 3600 + m * 60 + s; };

(async () => {
  fs.mkdirSync(CACHE, { recursive: true });
  const raw = {};
  for (const f of FILES) {
    process.stdout.write(f + ' … ');
    const t = await grab(f);
    if (!t) { console.error('받지 못했다'); process.exit(1); }
    raw[f] = parseCSV(t);
    console.log(raw[f].length + '행');
  }

  // 실제 역은 location_type=1(부모역)이다. 승강장(0)은 부모로 접는다.
  const station = {}, parent = {};
  raw.stops.forEach(s => {
    parent[s.stop_id] = s.parent_station || s.stop_id;
    if (s.location_type === '1') station[s.stop_id] = { nm: s.stop_name, pos: [+s.stop_lat, +s.stop_lon] };
  });
  const koName = j => STA_KO[j] || j;

  // trip 별 역 순서. 노선마다 가장 역이 많은 trip 을 그 노선의 전 구간으로 본다
  // (일부 열차는 중간에서 끊기거나 직통 운전으로 다른 노선까지 간다).
  const byTrip = {};
  raw.stop_times.forEach(t => (byTrip[t.trip_id] = byTrip[t.trip_id] || []).push(t));
  const tripRoute = {};
  raw.trips.forEach(t => tripRoute[t.trip_id] = { route: t.route_id, dir: t.direction_id });

  const best = {};      // 노선 → 가장 긴 역 순서
  for (const id in byTrip) {
    const meta = tripRoute[id]; if (!meta) continue;
    const seq = byTrip[id].slice().sort((a, b) => +a.stop_sequence - +b.stop_sequence);
    // 그 노선 소속 역만 남긴다(직통 구간을 잘라낸다)
    const names = seq.map(x => station[parent[x.stop_id]]).filter(Boolean);
    if (names.length < 2) continue;
    const key = meta.route + '|' + meta.dir;
    if (!best[key] || names.length > best[key].seq.length) best[key] = { seq, route: meta.route };
  }

  // 방향이 둘이므로 한쪽만 쓴다(더 긴 쪽)
  const lineSeq = {};
  for (const k in best) {
    const r = best[k].route;
    if (!lineSeq[r] || best[k].seq.length > lineSeq[r].length) lineSeq[r] = best[k].seq;
  }

  const routes = raw.routes.filter(r => lineSeq[r.route_id]);
  const lines = [], pos = {}, gap = {};
  routes.sort((a, b) => +a.route_sort_order - +b.route_sort_order).forEach(r => {
    const seq = lineSeq[r.route_id];
    const stNames = [], hops = [];
    let prev = null, prevDep = null;
    seq.forEach(x => {
      const s = station[parent[x.stop_id]]; if (!s) return;
      const ko = koName(s.nm);
      if (stNames[stNames.length - 1] === ko) return;   // 같은 역 중복
      pos[ko] = [+s.pos[0].toFixed(6), +s.pos[1].toFixed(6)];
      if (prev) {
        const d = km(prev.pos, s.pos);
        const t = secOf(x.arrival_time) - prevDep;
        hops.push([+d.toFixed(1), t]);
      }
      stNames.push(ko);
      prev = s; prevDep = secOf(x.departure_time);
    });
    if (stNames.length < 2) return;
    lines.push({ id: r.route_id, name: LINE_KO[r.route_id] || r.route_id, color: '#' + (r.route_color || '888888'), st: stNames });
    gap[r.route_id] = hops;
    console.log(`  ${LINE_KO[r.route_id] || r.route_id}: 역 ${stNames.length} · 구간 ${hops.length}`);
  });

  const q = s => JSON.stringify(s);
  let out = `// 후쿠오카시 지하철 — tools/mksubway-fukuoka.js 가 생성한다(수기 편집 금지).
//
// 출처: kuwayamamasayuki/GTFS-FukuokaCitySubway (MIT) 의 GTFS 를 가공.
// **공식 배포가 아니라 개인이 만든 비공식 데이터**다. 다이어 개정을 바로 못 따라갈 수 있다.
//
// gap[노선][i] = [거리km, 소요초] — i번째가 st[i-1] → st[i] 구간이다(부산과 같은 형식).
// 소요초는 GTFS 시각표의 실제 값이라 역간 편차가 그대로 반영된다.
window.REGIONS = window.REGIONS || {};
REGIONS.fukuoka.subway = {
  lines: [
`;
  lines.forEach(L => {
    out += `    { id: ${q(L.id)}, name: ${q(L.name)}, color: ${q(L.color)},\n`;
    out += `      st: [${L.st.map(q).join(', ')}] },\n`;
  });
  out += `  ],\n  // 역간 거리(km)·소요시간(초)\n  gap: {\n`;
  lines.forEach(L => {
    out += `    ${q(L.id)}: [` + gap[L.id].map(([d, t]) => `[${d},${t}]`).join(', ') + '],\n';
  });
  out += `  },\n  // 역 좌표 [위도, 경도]\n  pos: {\n`;
  Object.keys(pos).sort().forEach(k => out += `    ${q(k)}: [${pos[k][0]}, ${pos[k][1]}],\n`);
  out += `  }\n};\n`;

  const dest = path.join(dir, 'data/fukuoka-subway.js');
  fs.writeFileSync(dest, out);
  console.log(`\ndata/fukuoka-subway.js ${(out.length / 1024).toFixed(0)}KB · 노선 ${lines.length} · 역 ${Object.keys(pos).length}`);
})();
