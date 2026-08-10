// 지하철 노선 데이터·경로 탐색 검증
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
global.window = global;
eval(fs.readFileSync(path.join(dir, 'data/busan.js'), 'utf8'));
eval(fs.readFileSync(path.join(dir, 'data/subway.js'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
eval(html.slice(html.indexOf('const DETOUR'), html.indexOf('// 상태'))
  + ';global.subwayPath=subwayPath;global.nearestStation=nearestStation;global.subwayGraph=subwayGraph;global.km=km;');
global.S = { region: 'busan' };
const ok = (c, m) => console.log((c ? '✔' : '✘ FAIL') + ' ' + m);
const R = REGIONS.busan, SW = R.subway, poi = id => R.pois.find(p => p.id === id);

// ── 데이터 무결성
ok(SW.lines.length === 4, `노선 ${SW.lines.length}개`);
const counts = SW.lines.map(l => `${l.name} ${l.st.length}`).join(' · ');
ok(SW.lines[0].st.length === 40 && SW.lines[1].st.length === 43
   && SW.lines[2].st.length === 17 && SW.lines[3].st.length === 14, `역 수 실제와 일치 (${counts})`);
const all = new Set(SW.lines.flatMap(l => l.st));
ok(Object.keys(SW.pos).length === all.size, `좌표가 모든 역에 있다 (${all.size}개)`);
ok([...all].every(s => SW.pos[s]), '좌표 누락 없음');
ok(Object.keys(SW.pos).every(s => all.has(s)), '쓰이지 않는 좌표 없음');
// 좌표 범위 — 1호선은 양산까지 올라간다
const bad = Object.entries(SW.pos).filter(([, [la, ln]]) => !(la > 34.9 && la < 35.5 && ln > 128.7 && ln < 129.4));
ok(!bad.length, '좌표가 부산·양산 범위 안: ' + (bad.map(b => b[0]).join(',') || '이상 없음'));
// 노선 내 인접역은 서로 가깝다 (역간 5km 넘으면 순서가 틀린 것)
const far = [];
SW.lines.forEach(L => L.st.forEach((s, i) => {
  if (!i) return;
  const a = SW.pos[L.st[i - 1]], b = SW.pos[s];
  const d = km({ lat: a[0], lng: a[1] }, { lat: b[0], lng: b[1] });
  if (d > 5) far.push(`${L.name} ${L.st[i - 1]}~${s} ${d.toFixed(1)}km`);
}));
ok(!far.length, '인접역 간격 정상: ' + (far.join(', ') || '5km 초과 없음'));

// ── 환승역
const lineOf = {};
SW.lines.forEach(L => L.st.forEach(s => (lineOf[s] = lineOf[s] || []).push(L.id)));
const tr = Object.entries(lineOf).filter(([, l]) => l.length > 1).map(([s]) => s).sort();
ok(tr.length === 6, `환승역 ${tr.length}곳: ${tr.join(', ')}`);
['서면', '연산', '동래', '수영', '덕천', '미남'].forEach(s =>
  ok(lineOf[s] && lineOf[s].length === 2, `${s} 환승역 (${(lineOf[s] || []).join('/')})`));

// ── 경로 탐색
const P = (a, b) => subwayPath(a, b);
{
  const p = P(R.starts[0], poi('haeundae'));      // 부산역 → 해운대: 1호선 → 서면 환승 → 2호선
  ok(p !== null, '부산역→해운대 경로 있음');
  ok(p.fromSt === '부산', `출발역 부산역 (${p.fromSt}역)`);
  ok(p.transfers === 1, `환승 1회 (${p.transfers}회)`);
  ok(p.legs[0].line === '1' && p.legs[1].line === '2', `1호선 → 2호선 (${p.legs.map(l => l.name).join(' → ')})`);
  ok(p.legs[0].to === '서면', `서면에서 환승 (${p.legs[0].to}역)`);
  ok(p.stops > 15 && p.stops < 30, `정거장 수 ${p.stops}개 (15~30 기대)`);
}
{
  const p = P(R.starts[0], poi('jagalchi'));      // 부산역 → 자갈치: 1호선 직통 3정거장
  ok(p.transfers === 0, `부산역→자갈치 환승 없음 (${p.transfers}회)`);
  ok(p.legs[0].line === '1', '1호선 직통');
  ok(p.stops <= 5, `가까운 거리 ${p.stops}정거장`);
}
{
  const p = P(poi('haeundae'), poi('taejongdae'));  // 해운대 → 태종대: 태종대는 역이 멀다
  ok(p !== null && p.walkTo > 2, `태종대는 최근접역에서 멀다 (${p.walkTo.toFixed(1)}km, ${p.toSt}역)`);
}
{
  const p = P(poi('gamcheon'), poi('gamcheon'));
  ok(p === null, '같은 역이면 경로 없음(null)');
}
// 모든 POI 쌍에서 경로가 나오는가 — 지하철망은 연결그래프라 항상 나와야 한다
{
  const sample = R.pois.filter((_, i) => i % 7 === 0).slice(0, 20);
  let miss = 0, maxTr = 0;
  sample.forEach(a => sample.forEach(b => {
    if (a === b) return;
    const p = P(a, b);
    if (p === null) { if (nearestStation(a).st !== nearestStation(b).st) miss++; }
    else maxTr = Math.max(maxTr, p.transfers);
  }));
  ok(miss === 0, `표본 ${sample.length}곳 전 쌍에서 경로 탐색 성공 (실패 ${miss})`);
  // 3회 환승은 정당하다 — 금정산성(2호선 북단)↔부산대(1호선)는 덕천·미남·동래를 거치는
  // 13정거장이 서면 우회(35정거장)보다 짧다. 4회가 나오면 그래프가 잘못된 것.
  ok(maxTr <= 3, `최대 환승 ${maxTr}회 (3회 이하 기대)`);
}
// 최근접역 계산이 상식과 맞는가 — 역세권 장소는 역 이름이 딱 나와야 한다
[['haeundae', '해운대'], ['jagalchi', '자갈치'], ['centum', '센텀시티'], ['beomeosa_temple_cafe', null],
 ['gukje', '자갈치'], ['yongdusan', '남포']].forEach(([id, st]) => {
  const p = poi(id); if (!p) return;
  const n = nearestStation(p);
  ok(n.st === st || n.km < 1.2,
     `${p.name} 최근접역 ${n.st}역 ${n.km.toFixed(1)}km` + (n.st === st || !st ? '' : ` (기대 ${st}역)`));
});
// 동해선·김해경전철이 데이터에 없어 생기는 공백. 여기 있는 곳은 실제로는 지하철로 갈 수 있다.
{
  const gap = [['lotteworld', '오시리아(동해선)'], ['yongkungsa', '오시리아(동해선)']]
    .filter(([id]) => poi(id)).map(([id, real]) => `${poi(id).name}→${real}`);
  ok(gap.length > 0, '알려진 공백(동해선 미포함): ' + gap.join(', '));
}
// 역에서 먼 곳 — 최근접역 도보를 그대로 access 로 쓰면 안 되는 곳들.
// 이 목록이 곧 "지하철만으로는 못 가는 장소" 다.
{
  const far = R.pois.map(p => ({ p, n: nearestStation(p) })).filter(x => x.n.km > 3)
    .sort((a, b) => b.n.km - a.n.km);
  ok(far.length > 0, `역에서 3km 넘는 장소 ${far.length}곳 — 지하철 단독 이동 불가 구간`);
  ok(far.every(x => x.n.km < 20), '최근접역 거리 상한 정상(20km 미만): '
     + far.slice(0, 3).map(x => `${x.p.name} ${x.n.km.toFixed(1)}km`).join(', '));
  // 범어사는 절이 산 위라 어느 역에서도 2km 이상 떨어져 있다
  const bs = nearestStation(poi('beomeosa'));
  ok(bs.km > 2, `범어사는 최근접역(${bs.st}역)에서 ${bs.km.toFixed(1)}km — 역세권 아님`);
}

// ── 역간 소요시간·거리 (data/subway.js 의 gap)
// 경로 가중치가 실측 초라 "정거장 수는 많아도 빠른 길" 을 제대로 고른다.
{
  ok(!!SW.gap, 'gap 데이터 있음');
  SW.lines.forEach(L => ok(SW.gap[L.id] && SW.gap[L.id].length === L.st.length - 1,
    `${L.name} 구간 ${(SW.gap[L.id] || []).length}개 = 역 ${L.st.length}-1`));
  // 값의 범위 — 역간 0.5~3.5km, 60~260초를 벗어나면 데이터가 깨진 것
  const bad = [];
  for (const id in SW.gap) SW.gap[id].forEach(([d, t], i) => {
    if (!(d > 0.4 && d < 4) || !(t >= 60 && t <= 270)) bad.push(`${id}호선[${i}] ${d}km ${t}초`);
  });
  ok(!bad.length, '역간 거리·시간 범위 정상: ' + (bad.join(', ') || '이상 없음'));
  // 표정속도 — 주행만 따지면 20~55km/h 안에 들어야 한다
  const sp = [];
  for (const id in SW.gap) SW.gap[id].forEach(([d, t]) => sp.push(d / (t / 3600)));
  ok(sp.every(v => v > 18 && v < 56), `표정속도 ${Math.min(...sp).toFixed(0)}~${Math.max(...sp).toFixed(0)}km/h`);
}
// ── 소요시간 반환값
{
  const p = P(R.starts[0], poi('haeundae'));
  ok(p.min > 0, `부산역→해운대 ${p.min}분 (승차 ${p.rideMin} + 환승 ${p.transferMin})`);
  ok(p.min === p.rideMin + p.transferMin, '총시간 = 승차 + 환승');
  ok(p.min > 35 && p.min < 60, `실제 소요시간과 맞는 범위 (${p.min}분, 실제 약 45분)`);
  ok(Math.abs(p.rideKm - 19.9) < 2, `승차거리 ${p.rideKm}km (실제 약 20km)`);
  ok(p.legs.every(l => l.min > 0), '구간별 분이 모두 채워짐: ' + p.legs.map(l => l.min + '분').join(' + '));
  ok(Math.abs(p.legs.reduce((s, l) => s + l.min, 0) - p.rideMin) <= 1, '구간 분 합 == 승차 분');
}
{
  const p = P(R.starts[0], poi('jagalchi'));    // 3정거장 직통
  ok(p.min >= 4 && p.min <= 8, `부산역→자갈치 ${p.min}분 (3정거장 직통, 실제 약 5분)`);
  ok(p.transferMin === 0, '직통은 환승시간 0');
}
// 정거장 수가 아니라 시간으로 고르는가 — 센텀시티→범어사는 2회 환승이 서면 1회보다 빠르다
{
  const p = P(poi('centum'), poi('beomeosa'));
  const legMin = (line, a, b) => {           // 같은 노선 구간을 손으로 더해 대조군을 만든다
    const L = SW.lines.find(x => x.id === line);
    const i = L.st.indexOf(a), j = L.st.indexOf(b);
    let t = 0; for (let k = Math.min(i, j); k < Math.max(i, j); k++) t += SW.gap[line][k][1] + 25;
    return t / 60;
  };
  const viaSeomyeon = legMin('2', '센텀시티', '서면') + legMin('1', '서면', '범어사') + 5;
  ok(p.min < viaSeomyeon, `센텀시티→범어사: 고른 길 ${p.min}분 < 서면 경유 ${viaSeomyeon.toFixed(0)}분`);
  ok(p.transfers === 2, `정거장은 더 들러도 빠른 2회 환승을 고름 (${p.transfers}회)`);
}
// 모든 표본 쌍에서 시간이 상식 범위인가
{
  const sample = R.pois.filter((_, i) => i % 11 === 0).slice(0, 14);
  const times = [];
  sample.forEach(a => sample.forEach(b => { if (a !== b) { const p = P(a, b); if (p) times.push(p.min); } }));
  ok(times.every(t => t > 0 && t < 130), `표본 ${times.length}쌍 소요시간 ${Math.min(...times)}~${Math.max(...times)}분`);
}
