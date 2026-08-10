// 버스+지하철 통합 경로(data/transit.js) 검증
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
global.window = global;
eval(fs.readFileSync(path.join(dir, 'data/busan.js'), 'utf8'));
eval(fs.readFileSync(path.join(dir, 'data/subway.js'), 'utf8'));
eval(fs.readFileSync(path.join(dir, 'data/bus.js'), 'utf8'));
eval(fs.readFileSync(path.join(dir, 'data/transit.js'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
eval(html.slice(html.indexOf('const DETOUR'), html.indexOf('// 상태'))
  + ';global.transitPath=transitPath;global.transitText=transitText;global.travel=travel;global.km=km;');
global.S = { region: 'busan' };
const ok = (c, m) => console.log((c ? '✔' : '✘ FAIL') + ' ' + m);
const R = REGIONS.busan, T = R.transit, poi = id => R.pois.find(p => p.id === id);
const place = id => poi(id) || R.starts.find(s => s.id === id);

// ── 데이터 무결성
ok(!!T, 'transit 데이터 있음');
ok(T.ord.length === R.pois.length + R.starts.length,
   `장소 ${T.ord.length} = POI ${R.pois.length} + 출발지 ${R.starts.length}`);
ok(T.st.length > 100 && T.ln.length > 100, `이름사전 ${T.st.length} · 노선사전 ${T.ln.length}`);
// 상삼각만 담는다 — 같은 쌍이 양쪽으로 들어 있으면 안 된다
{
  const seen = new Set(), dup = [];
  T.pair.forEach(([a, b]) => { const k = Math.min(a, b) + '_' + Math.max(a, b);
    if (seen.has(k)) dup.push(k); seen.add(k); });
  ok(!dup.length, `중복 쌍 없음 (${T.pair.length}쌍)`);
  ok(T.pair.every(([a, b]) => a < b), '모두 상삼각(a<b)으로 저장');
}
// 인덱스가 사전 범위 안인가
{
  const bad = [];
  T.pair.forEach(([a, b, m, segs]) => {
    if (!(a >= 0 && a < T.ord.length && b >= 0 && b < T.ord.length)) bad.push('장소인덱스 ' + a + ',' + b);
    if (!(m > 0 && m < 400)) bad.push('소요시간 ' + m);
    segs.forEach(g => {
      if (g[1] >= T.st.length || g[2] >= T.st.length) bad.push('이름인덱스 ' + g[1] + ',' + g[2]);
      g[3].forEach(k => { if (k >= T.ln.length) bad.push('노선인덱스 ' + k); });
      if (!(g[4] > 0)) bad.push('정거장수 ' + g[4]);
    });
  });
  ok(!bad.length, '인덱스·값 범위 정상: ' + (bad.slice(0, 3).join(', ') || '이상 없음'));
}
// 쓰인 노선은 lines 에 정보가 있어야 안내를 낼 수 있다
{
  const used = new Set();
  T.pair.forEach(([, , , segs]) => segs.forEach(g => { if (g[0] === 1) g[3].forEach(k => used.add(T.ln[k])); }));
  const miss = [...used].filter(n => !T.lines[n]);
  ok(!miss.length, `버스 노선 ${used.size}개 전부 운행정보 있음` + (miss.length ? ' 누락:' + miss.slice(0, 3) : ''));
}

// ── 경로 조회
{
  const p = transitPath(place('busan_stn') || R.starts[0], poi('haeundae'));
  ok(p && p.min > 0, `부산역→해운대 ${p ? p.min + '분' : '실패'}`);
  ok(p.legs.every(l => l.from && l.to && l.stops > 0), '구간에 출발·도착·정거장수가 다 있다');
  ok(p.transfers === p.legs.length - 1, `환승 ${p.transfers}회 = 구간 ${p.legs.length}-1`);
}
// 양방향 — 표는 한 방향만 담으므로 뒤집어 읽는 게 맞아야 한다
{
  const a = poi('haeundae'), b = poi('gamcheon');
  const f = transitPath(a, b), r = transitPath(b, a);
  ok(f && r, '양방향 모두 조회된다');
  ok(f.min === r.min, `소요시간 대칭 (${f.min}분)`);
  ok(f.legs.length === r.legs.length, '구간 수 대칭');
  ok(r.legs[0].from === f.legs[f.legs.length - 1].to,
     `역방향은 순서·양끝이 뒤집힌다 (${f.legs[f.legs.length - 1].to} → ${r.legs[0].from})`);
}
// 지하철만으로 못 가던 곳 — 이게 이 데이터를 넣은 이유다
{
  const cases = [['haeundae', 'taejongdae', '태종대(최근접역 7km)'],
                 ['centum', 'yongkungsa', '해동용궁사(동해선 미포함)'],
                 ['jagalchi', 'beomeosa', '범어사(산 위)']];
  cases.forEach(([a, b, why]) => {
    const p = transitPath(poi(a), poi(b));
    ok(p && p.min > 0, `${poi(a).name}→${why}: ${p ? p.min + '분, 구간 ' + p.legs.length : '실패'}`);
  });
}
// 버스+지하철이 실제로 섞이는가
{
  let mixed = 0, subOnly = 0, busOnly = 0;
  T.pair.forEach(([, , , segs]) => {
    const kinds = new Set(segs.map(g => g[0]));
    if (kinds.size > 1) mixed++; else if (kinds.has(0)) subOnly++; else busOnly++;
  });
  ok(mixed > 0, `버스+지하철 혼합 ${mixed}쌍 · 지하철만 ${subOnly} · 버스만 ${busOnly}`);
  ok(mixed / T.pair.length > .2, `혼합 비율 ${(mixed / T.pair.length * 100).toFixed(0)}% — 통합 탐색이 실제로 일한다`);
}
// 지하철 구간의 노선 번호는 실재해야 한다
{
  const ids = SWID();
  function SWID() { return R.subway.lines.map(L => L.id); }
  const bad = [];
  T.pair.forEach(([, , , segs]) => segs.forEach(g => {
    if (g[0] === 0) g[3].forEach(k => { if (!ids.includes(T.ln[k])) bad.push(T.ln[k]); });
  }));
  ok(!bad.length, '지하철 구간 노선번호가 1~4호선 안: ' + ([...new Set(bad)].slice(0, 3).join(',') || '이상 없음'));
}
// 지하철 구간은 환승 지점에서 쪼개져 있어야 한다 — 한 구간에 노선이 둘이면 안 나뉜 것이다
{
  const multi = [];
  T.pair.forEach(([a, b, , segs]) => segs.forEach(g => { if (g[0] === 0 && g[3].length > 1) multi.push(T.ord[a] + '→' + T.ord[b]); }));
  ok(!multi.length, '지하철 구간마다 노선 하나: ' + (multi.slice(0, 2).join(', ') || '이상 없음'));
}

// ── travel() 연동
{
  const a = poi('haeundae'), b = poi('gamcheon');
  const t = travel(a, b, 'bus', 2, 600, false);
  const p = transitPath(a, b);
  ok(t.real, '버스 이동에 실측 플래그가 선다');
  ok(t.min > p.min, `총 ${t.min}분 > 승차 ${p.min}분 (정류장 도보·대기·access 가 더해진다)`);
  // 표에 없는 지점은 근사로 남아야 한다 — 좌표만 있는 가상 지점
  const ghost = { lat: 35.2, lng: 129.1 };
  const g = travel(a, ghost, 'bus', 2, 600, false);
  ok(!g.real && g.min > 0, `표에 없는 지점은 근사로 계산 (${g.min}분)`);
}
// 전 POI 쌍에서 실측이 붙는 비율
{
  let real = 0, apx = 0;
  R.pois.forEach(a => R.pois.forEach(b => { if (a !== b) (travel(a, b, 'bus', 2, 600, false).real ? real++ : apx++); }));
  ok(real / (real + apx) > .95, `버스 실측 적용 ${(real / (real + apx) * 100).toFixed(0)}% (${real}/${real + apx})`);
}
// 성능 — render() 마다 전 구간을 다시 계산하므로 조회가 싸야 한다
{
  const t0 = Date.now(); let n = 0;
  R.pois.forEach(a => R.pois.forEach(b => { if (a !== b) { travel(a, b, 'bus', 2, 600, false); n++; } }));
  const per = (Date.now() - t0) / n;
  ok(per < 0.05, `쌍당 ${per.toFixed(3)}ms (${n}회 ${Date.now() - t0}ms) — 미리 구운 표라 조회만 한다`);
}
// 소요시간이 상식 범위인가
{
  const all = [];
  T.pair.forEach(([, , m]) => all.push(m));
  all.sort((a, b) => a - b);
  ok(all[0] >= 1 && all[all.length - 1] < 250,
     `소요시간 ${all[0]}~${all[all.length - 1]}분 (중앙 ${all[Math.floor(all.length / 2)]}분)`);
}
// 한 줄 요약
{
  const p = transitPath(poi('haeundae'), poi('gamcheon'));
  const s = transitText(p);
  ok(s && s.length > 5, `요약: ${s}`);
}
