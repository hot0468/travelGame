// 버스 노선 데이터·직통 판정 검증
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
global.window = global;
eval(fs.readFileSync(path.join(dir, 'data/busan.js'), 'utf8'));
eval(fs.readFileSync(path.join(dir, 'data/bus.js'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
eval(html.slice(html.indexOf('const DETOUR'), html.indexOf('// 상태'))
  + ';global.busPair=busPair;global.busOf=busOf;global.km=km;');
global.S = { region: 'busan' };
const ok = (c, m) => console.log((c ? '✔' : '✘ FAIL') + ' ' + m);
const R = REGIONS.busan, B = R.bus, poi = id => R.pois.find(p => p.id === id);

// ── 데이터 무결성
ok(Object.keys(B.near).length === R.pois.length, `장소 ${Object.keys(B.near).length}곳 / 전체 ${R.pois.length}곳`);
ok(Object.keys(B.starts).length === R.starts.length, `출발지 ${Object.keys(B.starts).length}곳 전부 있다`);
const rows = [...Object.values(B.near), ...Object.values(B.starts)];
ok(rows.every(v => v.r.length && v.r.length <= 8), '장소당 노선 1~8개');
// 0.5km 밖은 mkbus 의 FAR 확장으로 잡은 외곽 장소. 그 이상 멀면 정류장을 잘못 붙인 것이다.
ok(rows.every(v => v.d <= 1.6), `정류장 1.6km 이내 (최대 ${Math.max(...rows.map(v => v.d)).toFixed(2)}km)`);
const farRows = rows.filter(v => v.d > .5);
ok(farRows.length <= 20, `정류장이 0.5km 넘게 먼 곳 ${farRows.length}곳 — UI 가 경고를 띄운다`);
ok(rows.every(v => v.s), '정류장 이름 누락 없음');
const used = new Set(rows.flatMap(v => v.r));
ok([...used].every(n => B.lines[n]), '쓰인 노선은 전부 lines 에 있다');
ok(Object.keys(B.lines).every(n => used.has(n)), `안 쓰이는 노선 없음 (${Object.keys(B.lines).length}개)`);
ok(rows.every(v => new Set(v.r).size === v.r.length), '한 장소에 중복 노선 없음');
const miss = R.pois.filter(p => !B.near[p.id]);
ok(!miss.length, '정류장 없는 장소 없음' + (miss.length ? ': ' + miss.map(p => p.name).join(', ') : ''));

// ── 직통 판정
{
  const p = busPair(R.starts.find(s => s.id === 'busanstn'), poi('gamcheon'));
  ok(p !== null, '부산역→감천문화마을 짝 있음');
  ok(p && p.direct.includes('서구2-2'), `직통 노선 ${p ? p.direct.join(', ') || '없음' : '-'}`);
}
{
  // 같은 정류장을 쓰는 두 장소는 버스로 갈 구간이 아니다
  const a = poi('gh_seomyeon');
  const b = R.pois.find(p => p.id !== a.id && B.near[p.id] && B.near[p.id].s === B.near[a.id].s);
  ok(!b || busPair(a, b) === null, '같은 정류장이면 안내 안 함(null)');
}
{
  const p = busPair(poi('taejongdae'), poi('gamcheon'));
  ok(p && p.from.d > 1, `태종대는 정류장에서 ${p ? p.from.d.toFixed(1) : '?'}km — UI 경고 대상`);
}
ok(busPair(null, poi('gamcheon')) === null, '지점이 없으면 null');

// 직통이 나오는 쌍이 너무 적으면(수집 실패) 너무 많으면(교집합이 헛돎) 이상하다
{
  const ids = Object.keys(B.near);
  let pairs = 0, direct = 0;
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    pairs++;
    if (B.near[ids[i]].r.some(n => B.near[ids[j]].r.includes(n))) direct++;
  }
  const pct = 100 * direct / pairs;
  ok(pct > 10 && pct < 45, `직통 비율 ${pct.toFixed(1)}% (10~45% 기대, ${direct}/${pairs}쌍)`);
}

// ── 노선 메타
{
  const t = Object.values(B.lines);
  ok(t.every(m => m.t), '차종 누락 없음');
  ok(t.filter(m => m.h).length > t.length * .7, `배차 있는 노선 ${t.filter(m => m.h).length}/${t.length}`);
  const bad = Object.entries(B.lines).filter(([, m]) => m.f && !/^\d\d:\d\d$/.test(m.f));
  ok(!bad.length, '첫차 시각 형식 정상: ' + (bad.map(b => b[0]).join(',') || '이상 없음'));
}
