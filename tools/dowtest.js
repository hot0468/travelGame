// 요일 규칙 검증: 휴무일 감지, 주말 숙박 할증, 주말 정체 없음
const fs = require('fs'), path = require('path');
const dir = require('path').join(__dirname, '..');
global.window = global;
eval(fs.readFileSync(path.join(dir, 'data/busan.js'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
eval(html.slice(html.indexOf('const DETOUR'), html.indexOf('// 상태'))
  + ';global.travel=travel;global.dowOf=dowOf;global.arrival=arrival;');
global.S = { region: 'busan' };
global.poi = id => REGIONS.busan.pois.find(p => p.id === id);
const ok = (c, m) => console.log((c ? '✔' : '✘ FAIL') + ' ' + m);
const R = REGIONS.busan, D = R.dayNames;

// 요일 계산
const q = R.quests[3];                     // 화요일 출발 3일
ok(D[dowOf(q, 0)] === '화' && D[dowOf(q, 2)] === '목', `3일차 요일: ${[0,1,2].map(d=>D[dowOf(q,d)]).join(',')}`);

// 월요일 휴관 시설을 월요일에 넣으면 위반
const mon = Object.assign({}, R.quests[0], { startDow: 0 });      // 월요일 출발
const tue = Object.assign({}, R.quests[0], { startDow: 1 });
const plan = [{ id: 'moak', mode: 'bus', stay: 90 }];             // 부산시립미술관 (월 휴관)
const a = compute({ region: 'busan', quest: mon, arriveId: 'ktx', plan, buffs: [] });
const b = compute({ region: 'busan', quest: tue, arriveId: 'ktx', plan, buffs: [] });
ok(a.bad.some(m => m.includes('휴무')), '월요일 휴관 시설 감지: ' + a.bad.find(m => m.includes('휴무')));
ok(!b.bad.some(m => m.includes('휴무')), '화요일에는 정상 운영');

// 금·토 체크인은 숙박비 40% 할증
const stayPlan = [{ id: 'hotel_gwangalli', mode: 'bus', stay: 0 }, { id: 'haeundae', mode: 'bus', stay: 60 }];
const cost = dow => compute({ region: 'busan', quest: Object.assign({}, R.quests[0], { startDow: dow }),
  arriveId: 'ktx', plan: stayPlan, buffs: [] }).spend;
const thu = cost(3), fri = cost(4), sat = cost(5);
ok(fri > thu && sat > thu, `금·토 숙박 할증 (목 ${thu.toLocaleString()} / 금 ${fri.toLocaleString()} / 토 ${sat.toLocaleString()})`);
ok(Math.abs((fri - thu) - 150000 * 1 * 0.4) < 1, `할증폭 정확 (+${(fri - thu).toLocaleString()}원 = 15만 × 2룸... 확인)`);

// 주말에는 출퇴근 정체가 없다
const from = R.starts[0], to = poi('haeundae');
const wkday = travel(from, to, 'bus', 2, 480, false);
const wkend = travel(from, to, 'bus', 2, 480, true);
ok(wkday.min > wkend.min, `평일 08시 정체 있음 / 주말 없음 (${wkday.min}분 vs ${wkend.min}분)`);
ok(wkend.min === wkend.base, '주말 이동시간 = 기본값');

// 휴무 정보가 실제 데이터에 있다
const shut = R.pois.filter(p => p.closed);
ok(shut.length >= 8, `휴무 시설 ${shut.length}곳`);
ok(shut.every(p => p.closed.every(d => d >= 0 && d <= 6)), '휴무 요일 값이 모두 0~6 범위');
