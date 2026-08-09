// 귀가 구간 + 제출 차단 사유 검증
const fs = require('fs'), path = require('path');
const dir = require('path').join(__dirname, '..');
global.window = global;
eval(fs.readFileSync(path.join(dir, 'data/busan.js'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
eval(html.slice(html.indexOf('const DETOUR'), html.indexOf('// 상태')) + ';global.arrival=arrival;global.startPoint=startPoint;');
global.S = { region: 'busan' };
global.poi = id => REGIONS.busan.pois.find(p => p.id === id);
const ok = (c, m) => console.log((c ? '✔' : '✘ FAIL') + ' ' + m);
const R = REGIONS.busan, q = R.quests[0];

const plan = [
  { id: 'gamcheon', mode: 'bus', stay: 120 },
  { id: 'dwaeji', mode: 'bus', stay: 50 },
  { id: 'gh_nampo', mode: 'bus', stay: 0 },
  { id: 'haeundae', mode: 'subway', stay: 90 },
  { id: 'gwangalli', mode: 'bus', stay: 60 }
];
const run = ret => compute({ region: 'busan', quest: q, arriveId: 'ktx', plan, buffs: [], ret });

const no = run(null), yes = run({ mode: 'taxi' });
ok(no.bad.some(m => m.includes('돌아가는 교통편')), '귀가 미지정은 위반: ' + no.bad.find(m => m.includes('돌아가는')));
ok(!yes.bad.some(m => m.includes('돌아가는 교통편')), '귀가를 정하면 해소');
ok(!!yes.back, '귀가 구간 생성');
ok(yes.back.name === startPoint({ region: 'busan', quest: q, arriveId: 'ktx' }).name, `출발지점으로 돌아감 (${yes.back.name})`);
ok(yes.back.day === q.days - 1, `마지막 날에 배치 (${yes.back.day + 1}일차)`);

// 마지막 일정이 끝난 시각에 출발한다
const last = yes.rows[yes.rows.length - 1];
ok(yes.back.begin === last.end, `마지막 일정 종료 시각에 출발 (${last.poi.name} 종료 = 귀가 출발)`);

// 비용·이동시간·체력에 모두 반영된다
ok(yes.spend > no.spend, `귀가 요금 반영 (+${(yes.spend - no.spend).toLocaleString()}원)`);
ok(yes.moveMin > no.moveMin, `귀가 이동시간 반영 (+${yes.moveMin - no.moveMin}분)`);
const lastDay = q.days - 1;
ok(yes.dayStat[lastDay].low < no.dayStat[lastDay].low, '귀가 체력 소모 반영');

// 수단을 바꾸면 값이 달라진다
const byBus = run({ mode: 'bus' }), byTaxi = run({ mode: 'taxi' });
ok(byTaxi.spend > byBus.spend && byTaxi.moveMin < byBus.moveMin, `수단별 차이 (버스 ${byBus.moveMin}분 vs 택시 ${byTaxi.moveMin}분)`);

// 일정이 비면 귀가를 요구하지 않는다
const empty = compute({ region: 'busan', quest: q, arriveId: 'ktx', plan: [], buffs: [], ret: null });
ok(!empty.bad.some(m => m.includes('돌아가는 교통편')), '일정이 비면 귀가를 묻지 않음');
