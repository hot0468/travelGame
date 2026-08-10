// data/transit.js 생성기 — 버스+지하철을 한 그래프에 얹어 장소 간 최적 경로를 미리 굽는다.
//   node tools/mktransit.js          (응답은 임시폴더에 캐시되므로 재실행은 오프라인으로 된다)
//   node tools/mktransit.js --fresh  캐시 무시하고 API 재호출
// 서비스키는 저장소 루트의 .apikey (gitignore 됨).
//
// 왜 미리 굽는가: 그래프가 노드 8,900 / 간선 18만이라 브라우저에서 한 쌍 푸는 데 0.5초가 걸린다.
// 게임은 render() 마다 전 구간을 다시 계산하므로 그 값으로는 못 쓴다. 다익스트라는 한 번에
// "출발지 → 전체" 를 주므로 장소 140곳에서 각 1회, 140회면 표 전체가 나온다(약 1분).
//
// 담는 것: 쌍별 소요시간(분)과 사람이 읽을 경로 요약("지하철 해운대→토성 · 버스 17번").
// 정류장 단위 전체 경로는 700KB 를 넘어 file:// 로딩이 무거워지므로 담지 않는다.
const fs = require('fs'), path = require('path'), os = require('os');
const dir = path.join(__dirname, '..');
const BASE = 'https://apis.data.go.kr/6260000/BusanBIMS';
const CACHE = path.join(os.tmpdir(), 'busan-bims');
const fresh = process.argv.includes('--fresh');

// ── 이동 파라미터. index.html 의 TRANSPORT 와 맞춘다.
const BUS_KMH = 18;          // 버스 표정속도
const BUS_DWELL = 20;        // 정류장당 정차(초)
const SUB_DWELL = 25;        // 역당 정차(초)
const WALK_KMH = 4.5;
const XFER_WALK = 0.4;       // 이 거리 안이면 걸어서 갈아탄다(km)
const BOARD_BUS = 300;       // 버스 승차 대기(초) — 배차 평균의 절반쯤
const BOARD_SUB = 180;       // 지하철 승차 대기(초)
const SUB_TRANSFER = 240;    // 지하철끼리 갈아타기(초) — 계단·통로 이동 + 반대편 열차 대기
const SEED_NEAR = 0.5;       // 장소에서 정류장·역까지 이 안이면 걸어간다(km)
const SEED_FAR = 1.6;        // 반경 안에 아무것도 없으면 여기까지 넓힌다(태종대·가덕도 등)

const keyFile = path.join(dir, '.apikey');
const KEY = fs.existsSync(keyFile)
  ? (fs.readFileSync(keyFile, 'utf8').match(/^BUSAN_BIMS_KEY=(.+)$/m) || [])[1] : null;
fs.mkdirSync(CACHE, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const items = x => (x.match(/<item>[\s\S]*?<\/item>/g) || []).map(s => {
  const o = {}; for (const m of s.matchAll(/<(\w+)>([^<]*)<\/\1>/g)) o[m[1]] = m[2]; return o;
});

async function get(op, params, tag) {
  const f = path.join(CACHE, tag + '.xml');
  if (!fresh && fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
  if (!KEY) { console.error('.apikey 가 없고 캐시도 없다. BUSAN_BIMS_KEY=... 한 줄을 넣어라.'); process.exit(1); }
  const q = new URLSearchParams({ ...params, numOfRows: params.numOfRows || 1000 });
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(`${BASE}/${op}?serviceKey=${KEY}&${q}`);
      const x = await r.text();
      if (x.includes('NORMAL SERVICE')) { fs.writeFileSync(f, x); return x; }
      if (x.includes('LIMITED_NUMBER_OF_SERVICE')) { console.error('일일 호출 한도 초과'); process.exit(1); }
    } catch (e) { /* 재시도 */ }
    await sleep(400 * (t + 1));
  }
  return '';
}

const RAD = 6371, rd = d => d * Math.PI / 180;
const dist = (a, b) => {
  const dl = rd(b.y - a.y), dg = rd(b.x - a.x);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(rd(a.y)) * Math.cos(rd(b.y)) * Math.sin(dg / 2) ** 2;
  return 2 * RAD * Math.asin(Math.sqrt(h));
};

(async () => {
  // ── 원본 수집
  const stops = {};
  for (let p = 1; p <= 9; p++)
    items(await get('busStopList', { pageNo: p }, `stops_${p}`))
      .forEach(s => stops[s.bstopid] = { nm: s.bstopnm, y: +s.gpsy, x: +s.gpsx });
  const lineRows = items(await get('busInfo', {}, 'lines'));
  const routes = {};
  for (const L of lineRows) {
    const seq = items(await get('busInfoByRouteId', { lineid: L.lineid }, `r_${L.lineid}`))
      .filter(s => s.nodeid && s.bstopidx).sort((a, b) => +a.bstopidx - +b.bstopidx).map(s => s.nodeid);
    if (seq.length) routes[L.buslinenum] = { seq, h: L.headway || '', t: L.bustype || '', f: L.firsttime || '', e: L.endtime || '' };
  }
  console.log(`정류장 ${Object.keys(stops).length} · 노선 ${Object.keys(routes).length}`);

  global.window = global;
  eval(fs.readFileSync(path.join(dir, 'data/busan.js'), 'utf8'));
  eval(fs.readFileSync(path.join(dir, 'data/subway.js'), 'utf8'));
  const R = REGIONS.busan, SW = R.subway;

  // ── 그래프. 노드는 'B|정류장id' / 'S|역명'
  const adj = {};
  const link = (u, v, w) => { (adj[u] = adj[u] || []).push([v, w]); };
  // "타고 이동하는" 간선이 붙은 노드. 도보 환승만으로 이어진 곳과 구분한다 —
  // 마린시티처럼 마을버스 전용 구역은 정류장끼리 도보로만 이어져 섬이 된다.
  const rideable = new Set();
  const ride = (u, v, w) => { link(u, v, w); rideable.add(u); rideable.add(v); };
  // 버스: 노선 순서대로 인접 정류장. 좌표 누적거리라 노선의 굴곡이 반영된다.
  // 편도 노선도 있지만 대부분 왕복이라 양방향으로 둔다(반대편 정류장은 길 건너 별도 id 라 어차피 갈린다).
  const busLineOf = {};       // 정류장 -> 그 정류장을 지나는 노선 번호들
  for (const n in routes) {
    const seq = routes[n].seq;
    seq.forEach(id => (busLineOf[id] = busLineOf[id] || new Set()).add(n));
    for (let i = 1; i < seq.length; i++) {
      const a = seq[i - 1], b = seq[i];
      if (!stops[a] || !stops[b]) continue;
      const d = dist(stops[a], stops[b]);
      if (d > 5) continue;                       // 좌표 이상치는 버린다
      const w = d / BUS_KMH * 3600 + BUS_DWELL;
      ride('B|' + a, 'B|' + b, w); ride('B|' + b, 'B|' + a, w);
    }
  }
  // 지하철: 실측 역간 소요시간(subway.gap). 노드는 'S|역명|노선' 이다 —
  // 'S|역명' 하나로 두면 수영역에서 2호선→3호선 갈아타기가 공짜가 되어
  // 정거장만 적으면 환승을 몇 번이든 하는 경로가 나온다.
  const stLines = {};
  SW.lines.forEach(L => L.st.forEach((s, i) => {
    (stLines[s] = stLines[s] || []).push(L.id);
    if (!i) return;
    const g = (SW.gap[L.id] || [])[i - 1];
    const w = (g ? g[1] : 90) + SUB_DWELL;
    const a = 'S|' + L.st[i - 1] + '|' + L.id, b = 'S|' + s + '|' + L.id;
    ride(a, b, w); ride(b, a, w);
  }));
  // 같은 역의 다른 노선끼리 = 갈아타기. 계단·이동에 드는 시간을 물린다.
  for (const st in stLines) stLines[st].forEach(x => stLines[st].forEach(y => {
    if (x !== y) link('S|' + st + '|' + x, 'S|' + st + '|' + y, SUB_TRANSFER);
  }));
  // 환승: 가까운 정류장·역끼리 도보로 잇는다. 전수 비교는 8,900² 이라 격자로 후보를 좁힌다.
  const nodes = [];
  for (const id in stops) nodes.push({ k: 'B|' + id, y: stops[id].y, x: stops[id].x });
  // 역은 노선마다 노드가 따로다. 도보로 닿는 정류장은 그 역의 모든 노선에 붙는다.
  for (const st in SW.pos) (stLines[st] || []).forEach(ln =>
    nodes.push({ k: 'S|' + st + '|' + ln, y: SW.pos[st][0], x: SW.pos[st][1] }));
  const GS = 0.005, grid = {};
  const cell = (y, x) => Math.round(y / GS) + ',' + Math.round(x / GS);
  nodes.forEach(n => (grid[cell(n.y, n.x)] = grid[cell(n.y, n.x)] || []).push(n));
  nodes.forEach(n => {
    const cy = Math.round(n.y / GS), cx = Math.round(n.x / GS);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
      for (const m of (grid[(cy + dy) + ',' + (cx + dx)] || [])) {
        if (m.k === n.k) continue;
        const d = dist(n, m);
        if (d > XFER_WALK) continue;
        link(n.k, m.k, d / WALK_KMH * 3600 + (m.k[0] === 'S' ? BOARD_SUB : BOARD_BUS));
      }
  });
  console.log(`그래프 노드 ${nodes.length} · 간선 ${Object.values(adj).reduce((s, a) => s + a.length, 0)}`);

  // ── 장소별 진입점(반경 안 정류장·역). 없으면 FAR 까지 넓힌다.
  const places = [...R.pois.map(p => ({ id: p.id, nm: p.name, y: p.lat, x: p.lng })),
                  ...R.starts.map(s => ({ id: s.id, nm: s.name, y: s.lat, x: s.lng }))];
  // 간선이 붙은 노드만 진입점이 된다. 마을버스 전용 정류장은 노선 데이터가 없어
  // 고립돼 있는데(BIMS 목록에 마을버스가 빠져 있다), 그걸 진입점으로 잡으면
  // 다익스트라가 한 발짝도 못 나간다 — 파크 하얏트가 135쌍 전부 경로 없음이었던 이유다.
  const live = n => rideable.has(n.k);
  const seedsOf = p => {
    let hit = nodes.filter(n => live(n) && dist(n, p) <= SEED_NEAR);
    if (!hit.length) hit = nodes.filter(n => live(n) && dist(n, p) <= SEED_FAR);
    // 그래도 없으면 더 넓혀서라도 잡는다(가덕도처럼 외진 곳). 거리는 도보시간에 그대로 반영된다.
    if (!hit.length) {
      const sorted = nodes.filter(live).map(n => [n, dist(n, p)]).sort((a, b) => a[1] - b[1]);
      hit = sorted.slice(0, 3).map(x => x[0]);
    }
    return hit.map(n => [n.k, dist(n, p)]);
  };
  const seeds = {}; places.forEach(p => seeds[p.id] = seedsOf(p));
  const noSeed = places.filter(p => !seeds[p.id].length);
  if (noSeed.length) console.log('진입점 없는 장소:', noSeed.map(p => p.nm).join(', '));

  // ── 이진힙 (배열 정렬로는 140회가 너무 느리다)
  class Heap {
    constructor() { this.a = []; }
    push(x) { const a = this.a; a.push(x); let i = a.length - 1;
      while (i) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
    pop() { const a = this.a, top = a[0], last = a.pop();
      if (a.length) { a[0] = last; let i = 0;
        for (;;) { const l = 2 * i + 1, r = l + 1; let m = i;
          if (l < a.length && a[l][0] < a[m][0]) m = l;
          if (r < a.length && a[r][0] < a[m][0]) m = r;
          if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
      return top; }
    get size() { return this.a.length; }
  }
  // 한 장소에서 전체로 — 이래서 140회면 표가 다 나온다
  function from(pid) {
    const D = {}, prev = {}, h = new Heap();
    seeds[pid].forEach(([k, d]) => { const w = d / WALK_KMH * 3600;
      if (D[k] === undefined || w < D[k]) { D[k] = w; h.push([w, k]); } });
    const done = {};
    while (h.size) {
      const [d, u] = h.pop();
      if (done[u]) continue; done[u] = 1;
      for (const [v, w] of (adj[u] || [])) {
        const nd = d + w;
        if (D[v] === undefined || nd < D[v]) { D[v] = nd; prev[v] = u; h.push([nd, v]); }
      }
    }
    return { D, prev };
  }
  // 경로를 "지하철 해운대역→토성역 · 버스 17번" 으로 압축한다.
  // 버스 구간의 노선 번호는 그 구간 정류장들이 공유하는 노선의 교집합에서 고른다.
  function summarize(prev, endKey) {
    const p = []; for (let n = endKey; n; n = prev[n]) p.unshift(n);
    // 'S|역명|노선' / 'B|정류장id'. 지하철은 노선이 바뀌면 구간을 끊는다.
    const segs = [];
    p.forEach(k => {
      const kind = k[0];
      const rest = k.slice(2), bar = rest.indexOf('|');
      const id = kind === 'S' && bar >= 0 ? rest.slice(0, bar) : rest;
      const ln = kind === 'S' && bar >= 0 ? rest.slice(bar + 1) : null;
      const last = segs[segs.length - 1];
      if (last && last.kind === kind && last.ln === ln) { last.ids.push(id); }
      else segs.push({ kind, ln, ids: [id] });
    });
    const out = [];
    segs.filter(s => s.ids.length > 1).forEach(s => {
      if (s.kind === 'S') {
        // 노선은 노드 키에 들어 있다(구간을 나눌 때 이미 노선별로 끊었다).
        out.push({ m: 'sub', a: s.ids[0], b: s.ids[s.ids.length - 1], l: [s.ln], n: s.ids.length - 1 });
        return;
      }
      const sets = s.ids.map(id => busLineOf[id] || new Set());
      let common = [...(sets[0] || [])].filter(n => sets.every(x => x.has(n)));
      if (!common.length) {                     // 한 노선으로 안 이어지면 가장 많이 겹치는 것을 낸다
        const cnt = {}; sets.forEach(x => x.forEach(n => cnt[n] = (cnt[n] || 0) + 1));
        common = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);
      }
      const nm = id => (stops[id] || {}).nm || id;
      out.push({ m: 'bus', a: nm(s.ids[0]), b: nm(s.ids[s.ids.length - 1]), l: common.slice(0, 3), n: s.ids.length - 1 });
    });
    return out;
  }

  // ── 전 장소에서 굽는다
  const T = {}, t0 = Date.now();
  places.forEach((p, i) => {
    const { D, prev } = from(p.id);
    const row = {};
    places.forEach(q => {
      if (q.id === p.id) return;
      let best = null;
      for (const [k, d] of seeds[q.id]) {
        const t = D[k]; if (t === undefined) continue;
        const tot = t + d / WALK_KMH * 3600;
        if (!best || tot < best.t) best = { t: tot, k };
      }
      if (!best) return;
      row[q.id] = { m: Math.round(best.t / 60), s: summarize(prev, best.k) };
    });
    T[p.id] = row;
    if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${places.length} (${((Date.now() - t0) / 1000).toFixed(0)}초)`);
  });
  console.log(`탐색 완료 ${((Date.now() - t0) / 1000).toFixed(0)}초`);

  // ── 출력. 그대로 쓰면 2MB 가 넘는다(쌍 19,182 × 정류장 이름 반복).
  // 줄이는 세 가지: ① 이름·노선을 사전 인덱스로 ② a→b 와 b→a 는 평균 1.9분 차이뿐이라 상삼각만
  // ③ 장소는 배열 순번으로. 이렇게 390KB 가 된다.
  const names = [], ni = {}, lineArr = [], li = {};
  const N = t => ni[t] !== undefined ? ni[t] : (ni[t] = names.push(t) - 1);
  const LI = t => li[t] !== undefined ? li[t] : (li[t] = lineArr.push(t) - 1);
  const ids = places.map(p => p.id);
  const rows = [];
  for (let a = 0; a < ids.length; a++) {
    for (let b = a + 1; b < ids.length; b++) {
      const c = (T[ids[a]] || {})[ids[b]] || (T[ids[b]] || {})[ids[a]];
      if (!c) continue;
      // 구간 = [수단(0=지하철,1=버스), 출발명, 도착명, [노선...], 정거장수]
      const segs = c.s.map(g => [g.m === 'sub' ? 0 : 1, N(g.a), N(g.b), g.l.map(LI), g.n]);
      rows.push(`[${a},${b},${c.m},${JSON.stringify(segs)}]`);
    }
  }
  const usedLines = new Set(lineArr);
  let out = `// 부산 대중교통 통합 경로 — 버스+지하철을 한 그래프로 풀어 장소 쌍마다 미리 구운 결과다.
// tools/mktransit.js 가 생성한다(수기 편집 금지).
// 출처: 부산버스정보시스템 OpenAPI(노선·정류장) + 부산교통공사 역간 거리·소요시간.
//
// 왜 구워서 넣는가: 그래프가 노드 8,900·간선 18만이라 브라우저에서 한 쌍 푸는 데 0.5초가 든다.
// render() 마다 전 구간을 다시 계산하는 구조라 그 값으로는 못 쓴다.
// 장소를 추가·이동하면 이 파일을 다시 생성해야 한다.
//
//   st    정류장·역 이름 사전
//   ln    노선 번호 사전
//   ord   장소 id 순서 (아래 쌍의 인덱스가 가리킨다)
//   pair  [출발idx, 도착idx, 소요분, [구간...]]  — 구간 = [0=지하철|1=버스, 출발st, 도착st, [ln...], 정거장수]
//         a→b 와 b→a 는 평균 1.9분 차이뿐이라 한 방향만 담는다(양방향으로 읽는다).
//   lines 노선 운행정보 { t:차종, h:배차, f:첫차, e:막차 }
window.REGIONS = window.REGIONS || {};
REGIONS.busan.transit = {
  st: ${JSON.stringify(names)},
  ln: ${JSON.stringify(lineArr)},
  ord: ${JSON.stringify(ids)},
  lines: {\n`;
  [...usedLines].sort().forEach(n => {
    const L = routes[n]; if (!L) return;
    out += `    ${JSON.stringify(n)}: { t: ${JSON.stringify(L.t)}, h: ${JSON.stringify(L.h)}, f: ${JSON.stringify(L.f)}, e: ${JSON.stringify(L.e)} },\n`;
  });
  out += `  },
  pair: [\n`;
  rows.forEach(r => { out += '    ' + r + ',\n'; });
  out += `  ]
};\n`;
  const dest = path.join(dir, 'data/transit.js');
  fs.writeFileSync(dest, out);
  console.log(`data/transit.js ${(out.length / 1024).toFixed(0)}KB · 쌍 ${rows.length} · 이름 ${names.length} · 노선 ${lineArr.length}`);
})();
