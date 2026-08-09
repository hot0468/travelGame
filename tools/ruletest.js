// 새 규칙 검증: 도보, 교통편별 체력, 귀가 왕복요금, 예산초과 감점, 버프 사용횟수
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
global.window = global;
eval(fs.readFileSync(path.join(dir, 'data/busan.js'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
eval(html.slice(html.indexOf('const DETOUR'), html.indexOf('// 상태'))
  + ';global.TRANSPORT=TRANSPORT;global.BUFFS=BUFFS;global.travel=travel;global.arrival=arrival;');
global.S = { region: 'busan' };
global.poi = id => REGIONS.busan.pois.find(p => p.id === id);
const ok = (c, m) => console.log((c ? '✔' : '✘ FAIL') + ' ' + m);
global.hhmm = m => String(Math.floor((m % 1440) / 60)).padStart(2, '0') + ':' + String(Math.round(m % 60)).padStart(2, '0');
const R = REGIONS.busan, q = R.quests[0];

// ── 도보
ok(!!TRANSPORT.walk, '도보 수단 존재');
const from = R.starts[0], to = poi('jagalchi');
const w = travel(from, to, 'walk', 2, 600, false), b = travel(from, to, 'bus', 2, 600, false);
ok(w.cost === 0, '도보 요금 0원');
ok(w.min > b.min, `도보가 버스보다 느림 (${w.min}분 vs ${b.min}분)`);
ok(travel(from, to, 'walk', 2, 480, false).min === travel(from, to, 'walk', 2, 840, false).min, '도보는 정체 영향 없음');
const plan1 = m => compute({ region: 'busan', quest: q, arriveId: 'ktx', buffs: [], plan: [{ id: 'jagalchi', mode: m, stay: 60 }] });
const dW = plan1('walk').rows[0].dMove, dB = plan1('bus').rows[0].dMove;   // dMove 는 양수 = 소모량
ok(dW > dB, `도보가 체력을 가장 많이 깎음 (${dW.toFixed(1)} vs 버스 ${dB.toFixed(1)})`);

// ── 접근 도보 보정(access) — 실측값에 맞는지
{
  const stn = R.starts[0], gc = poi('gamcheon');           // 부산역 → 감천문화마을
  const near = (got, real, tol, m) => ok(Math.abs(got - real) <= tol, `${m}: ${got}분 (실측 ${real}분)`);
  near(travel(stn, gc, 'bus', 2, 600, false).min, 46, 4, '부산역→감천 버스');
  near(travel(stn, gc, 'subway', 2, 600, false).min, 37, 4, '부산역→감천 지하철');
  ok(travel(stn, gc, 'subway', 2, 600, false).walkMin === TRANSPORT.subway.walk + gc.access,
     `도보 시간에 접근 보정 포함 (${travel(stn, gc, 'subway', 2, 600, false).walkMin}분)`);
  // 택시·렌터카는 문 앞까지 가므로 보정을 받지 않는다
  const noAcc = { ...gc, access: 0 };
  ok(travel(stn, gc, 'taxi', 2, 600, false).min === travel(stn, noAcc, 'taxi', 2, 600, false).min,
     '택시는 접근 보정 없음');
  ok(travel(stn, gc, 'bus', 2, 600, false).min > travel(stn, noAcc, 'bus', 2, 600, false).min,
     '버스는 접근 보정 받음');
  // 정체는 주행 구간만 늘린다 — 걷는 시간까지 1.5배가 되면 안 된다
  const calm = travel(stn, gc, 'bus', 2, 600, false), rush = travel(stn, gc, 'bus', 2, 480, false);
  ok(rush.min - calm.min <= Math.ceil(calm.km / TRANSPORT.bus.kmh * 60 * .5) + 1,
     `정체 가산이 주행분에만 붙음 (+${rush.min - calm.min}분)`);
}

// ── 교통편별 도착 체력
const byArr = id => compute({ region: 'busan', quest: q, arriveId: id, buffs: [], plan: [] }).dayStat[0].start;
ok(byArr('ktx') > byArr('car'), `KTX 도착이 자차보다 체력 남음 (${byArr('ktx').toFixed(1)} vs ${byArr('car').toFixed(1)})`);
ok(byArr('ktx') > byArr('bus') && byArr('bus') > byArr('car'), 'KTX > 고속버스 > 자차 순으로 덜 지침');

// ── 귀가 왕복 요금
const P = [{ id: 'gamcheon', mode: 'bus', stay: 120 }, { id: 'dwaeji', mode: 'bus', stay: 50 },
           { id: 'gh_nampo', mode: 'bus', stay: 0 }, { id: 'haeundae', mode: 'subway', stay: 90 }];
const noRet = compute({ region: 'busan', quest: q, arriveId: 'ktx', buffs: [], plan: P });
const withRet = compute({ region: 'busan', quest: q, arriveId: 'ktx', buffs: [], plan: P, ret: { mode: 'bus' } });
const oneWay = 59800 * q.people;
ok(withRet.spend - noRet.spend > oneWay, `귀가 지정 시 도시간 왕복 요금 반영 (+${(withRet.spend - noRet.spend).toLocaleString()}원 > 편도 ${oneWay.toLocaleString()})`);

// ── 도시간 귀가편 시간도 이동시간에 든다
{
  const arrMin = R.origins[q.from].find(o => o.id === 'ktx').min;
  ok(withRet.moveMin - noRet.moveMin > arrMin,
     `귀가 지정 시 도시간 귀가 시간 산입 (+${withRet.moveMin - noRet.moveMin}분 > KTX ${arrMin}분)`);
  ok(withRet.back.home && withRet.back.home.min === arrMin, `귀가편 구간 정보 (${q.from} ${arrMin}분)`);
  // 마감은 출발지점 도착 기준 — 집 도착이 마감을 넘겨도 위반이 아니다
  const mid = [{ id: 'gamcheon', mode: 'taxi', stay: 120 }, { id: 'dwaeji', mode: 'taxi', stay: 60 },
               { id: 'gh_nampo', mode: 'taxi', stay: 0 }, { id: 'haeundae', mode: 'taxi', stay: 600 }];
  const m = compute({ region: 'busan', quest: q, arriveId: 'ktx', buffs: [], plan: mid, ret: { mode: 'taxi' } });
  const dueAbs = (m.days - 1) * 1440 + q.endBy;
  ok(m.back.end <= dueAbs && m.back.end + m.back.home.min > dueAbs && !m.bad.some(x => x.includes('귀가 마감')),
     `마감은 출발지점 도착 기준 (부산역 ${hhmm(m.back.end)} ≤ ${hhmm(q.endBy)} · 집 도착 ${hhmm(m.back.end + m.back.home.min)} 은 무관)`);
  const slow = compute({ region: 'busan', quest: q, arriveId: 'bus', buffs: [], plan: P, ret: { mode: 'bus' } });
  const fast = compute({ region: 'busan', quest: q, arriveId: 'air', buffs: [], plan: P, ret: { mode: 'bus' } });
  ok(slow.moveMin > fast.moveMin, `느린 교통편이 이동시간을 더 먹는다 (고속버스 ${slow.moveMin}분 > 항공 ${fast.moveMin}분)`);
}

// ── 예산 초과: 막지 않고 감점
const rich = [{ id: 'hotel_paradise', mode: 'taxi', stay: 0 }, { id: 'signiel', mode: 'taxi', stay: 0 },
              { id: 'lotteworld', mode: 'taxi', stay: 300 }];
const bust = compute({ region: 'busan', quest: q, arriveId: 'air', buffs: [], plan: rich, ret: { mode: 'taxi' } });
ok(bust.over > 0, `예산 초과 발생 (${bust.over.toLocaleString()}원)`);
ok(!bust.bad.some(m => m.includes('예산 초과')), '예산 초과가 제출을 막지 않음');
{ // 같은 조건에서 초과분이 클수록 점수가 낮다
  const q2 = Object.assign({}, q, { budget: q.budget * 3 });
  const loose = compute({ region: 'busan', quest: q2, arriveId: 'air', buffs: [], plan: rich, ret: { mode: 'taxi' } });
  ok(loose.score > bust.score, `초과분이 점수를 깎음 (여유예산 ${loose.score} > 초과 ${bust.score})`);
}

// ── 버프 사용 횟수
{
  const many = [];                       // 유료 관광지 5곳 — 단체 입장권(3회)은 3곳까지만
  ['yongdusan', 'songdo', 'xthesky', 'aquarium', 'lotteworld'].forEach(id => many.push({ id, mode: 'taxi', stay: 60 }));
  const base = compute({ region: 'busan', quest: q, arriveId: 'ktx', buffs: [], plan: many });
  const buff = compute({ region: 'busan', quest: q, arriveId: 'ktx', buffs: ['groupticket'], plan: many });
  const paid = many.map(e => poi(e.id).cost * q.people);
  const first3 = paid.slice(0, 3).reduce((a, c) => a + c, 0);
  const saved = base.spend - buff.spend;
  ok(Math.abs(saved - Math.round(first3 * .15)) <= 3,
     `단체 입장권 3회만 적용 (절약 ${saved.toLocaleString()} ≈ 앞 3곳의 15% ${Math.round(first3 * .15).toLocaleString()})`);
  ok(buff.left.groupticket === 0, '사용 후 잔여 0');
  ok(BUFFS.groupticket.uses === 3, '정의된 횟수 3');
}
{ // 미식가(3회): 식당 5곳이어도 +2 는 3번만
  const foods = ['dwaeji', 'milmyeon', 'hotteok', 'eomuk', 'hoe'].map(id => ({ id, mode: 'taxi', stay: 40 }));
  const a = compute({ region: 'busan', quest: q, arriveId: 'ktx', buffs: [], plan: foods });
  const c = compute({ region: 'busan', quest: q, arriveId: 'ktx', buffs: ['foodie'], plan: foods });
  ok(c.joy - a.joy === 6, `미식가 3회 = 만족도 +6 (실제 +${c.joy - a.joy})`);
}

// ── 숙소 등급별 수면 회복 — 비싼 숙소가 만족도 말고도 값어치를 가져야 한다
{
  const night = id => [{ id: 'haeundae', mode: 'taxi', stay: 90 }, { id, mode: 'taxi', stay: 0 },
                       { id: 'jagalchi', mode: 'taxi', stay: 60 }];
  const capOf = id => compute({ region: 'busan', quest: q, arriveId: 'ktx', buffs: [], plan: night(id) }).dayStat[1].cap;
  const gh = capOf('gh_nampo'), mo = capOf('motel_seomyeon'), ho = capOf('hotel_paradise');
  ok(ho > mo && mo > gh, `호텔 > 모텔 > 게스트하우스 순으로 회복 (${ho} > ${mo} > ${gh})`);
  ok(Math.abs(ho / mo - 1.08) < .02, `호텔 회복 보너스 +8% (실제 ${((ho / mo - 1) * 100).toFixed(1)}%)`);

  // 고급 호텔이 실제로 최적해에 들어갈 수 있는 의뢰가 있어야 한다 (2인 = 객실 1개)
  const lux = R.quests.find(x => x.id === 'q6');
  ok(lux && lux.people === 2 && lux.minStayTier === 'hotel', 'q6: 2인 · 호텔 이상 요구');
  const top = R.pois.filter(p => p.type === 'stay' && p.cost >= 300000);
  const room = Math.ceil(lux.people / 2);
  const nights = lux.days - 1;
  const worst = Math.max(...top.map(p => p.cost)) * room * nights * R.weekendStay.rate;
  ok(worst < lux.budget * .75,
     `최고급 호텔 ${nights}박이 예산 안에 들어옴 (최대 ${worst.toLocaleString()} < 예산의 75% ${(lux.budget * .75).toLocaleString()})`);
}

// ── 넣을 수 없는 장소 판정 (whyBlocked)
// index.html 의 렌더 헬퍼 구간에서 blockCtx/whyBlocked 만 떼어와 순수 함수로 검사한다.
{
  const seg = html.slice(html.indexOf('// 넣을 수 있는지 판단할 때 쓰는 문맥'), html.indexOf('// 지도 위 장소 상세 팝업'));
  global.insertAtDay = d => { let seen = 0;
    for (let i = 0; i < S.plan.length; i++) {
      if (poi(S.plan[i].id).type === 'stay') { if (seen === d) return i; seen++; }
    } return S.plan.length; };
  global.wakeOf = d => d === 0 ? (arrival(S) ? arrival(S).arrive : 540) : 540;
  global.startPoint = eval('(' + html.slice(html.indexOf('function startPoint'), html.indexOf('// 초기 이동비')).trim() + ')');
  global.dowOf = (q, d) => ((q.startDow || 0) + d) % 7;
  global.isWeekend = n => n >= 5;
  eval(seg + ';global.blockCtx=blockCtx;global.whyBlocked=whyBlocked;');

  // 월요일 출발 · 첫 일정을 저녁까지 끌어 늦게 만든다
  Object.assign(S, { quest: Object.assign({}, R.quests[0], { startDow: 0 }), arriveId: 'ktx', day: 0, buffs: [],
                     plan: [{ id: 'haeundae', mode: 'taxi', stay: 600 }] });
  const ctx = blockCtx();
  const blocked = R.pois.filter(p => whyBlocked(p, ctx));
  ok(ctx != null, `문맥 생성 (출발 ${hhmm(ctx.depart)})`);
  ok(blocked.length > 0, `넣을 수 없는 장소 ${blocked.length}곳 감지`);
  ok(whyBlocked(poi('moak'), ctx) === '월요일 휴무', '월요일 휴관 시설 차단: ' + whyBlocked(poi('moak'), ctx));
  ok(/영업 종료/.test(whyBlocked(poi('gamcheon'), ctx) || ''), '마감(18:00) 지난 곳 차단: ' + whyBlocked(poi('gamcheon'), ctx));
  ok(whyBlocked(poi('haeundae'), ctx) === null, '24시간 개방된 곳은 통과');
  ok(R.pois.filter(p => p.type === 'stay').every(p => !whyBlocked(p, ctx) || /휴무/.test(whyBlocked(p, ctx))),
     '숙소는 영업시간으로 막지 않음');
  // 아침 출발이면 대부분 열려 있다
  S.plan = [];
  const early = blockCtx();
  ok(R.pois.filter(p => whyBlocked(p, early)).length < blocked.length,
     `이른 시간에는 차단이 줄어든다 (${R.pois.filter(p => whyBlocked(p, early)).length}곳 < ${blocked.length}곳)`);
}

// ── 지출 내역(bills): 항목 합이 총 경비와 맞아야 한다
{
  const cases = [
    ['기본', { arriveId: 'ktx', buffs: [], plan: P, ret: { mode: 'bus' } }],
    ['렌터카', { arriveId: 'ktx', buffs: [], plan: P.map(e => ({ ...e, mode: 'car' })), ret: { mode: 'car' } }],
    ['교통패스', { arriveId: 'air', buffs: ['transitpass', 'rentalclub', 'groupticket', 'taxicoupon'], plan: P, ret: { mode: 'subway' } }],
    ['귀가 없음', { arriveId: 'bus', buffs: [], plan: P }]
  ];
  cases.forEach(([nm, o]) => {
    const r = compute({ region: 'busan', quest: q, ...o });
    const total = r.bills.reduce((a, c) => a + c.amt, 0);
    ok(Math.abs(total - r.spend) <= r.bills.length,
       `${nm}: 내역 합 ${total.toLocaleString()} ≈ 총 경비 ${r.spend.toLocaleString()} (항목 ${r.bills.length}개, 오차 ${total - r.spend})`);
  });
  const r0 = compute({ region: 'busan', quest: q, arriveId: 'ktx', buffs: [], plan: [] });
  ok(r0.bills.length === 1 && r0.bills[0].amt === r0.spend, '일정이 비면 도착 교통비 한 줄만');
}

// ── 귀가 마감 (endBy)
{
  R.quests.forEach(qq => ok(typeof qq.endBy === 'number' && qq.endBy > 0 && qq.endBy <= 1440,
    `${qq.id} 마감 시각 정의됨 (${Math.floor(qq.endBy / 60)}시 ${qq.endBy % 60}분)`));

  // 마지막 일정을 늦게 끝내면 마감을 넘긴다
  const late = [{ id: 'gamcheon', mode: 'taxi', stay: 120 }, { id: 'dwaeji', mode: 'taxi', stay: 60 },
                { id: 'gh_nampo', mode: 'taxi', stay: 0 }, { id: 'haeundae', mode: 'taxi', stay: 780 }];
  const over = compute({ region: 'busan', quest: q, arriveId: 'ktx', buffs: [], plan: late, ret: { mode: 'taxi' } });
  ok(over.bad.some(m => m.includes('귀가 마감')), '늦게 끝내면 마감 위반: ' + (over.bad.find(m => m.includes('귀가 마감')) || '없음'));

  // 같은 일정을 짧게 끝내면 통과
  const early = late.map(e => ({ ...e, stay: e.id === 'haeundae' ? 90 : e.stay }));
  const okRes = compute({ region: 'busan', quest: q, arriveId: 'ktx', buffs: [], plan: early, ret: { mode: 'taxi' } });
  ok(!okRes.bad.some(m => m.includes('귀가 마감')), '일찍 끝내면 마감 통과');
  ok(okRes.back.end <= (okRes.days - 1) * 1440 + q.endBy,
     `귀가 도착 ${hhmm(okRes.back.end)} ≤ 마감 ${hhmm(q.endBy)}`);

  // 마감이 이른 의뢰가 더 빡빡하다 — q4(19:00) 가 q3(23:00) 보다 이르다
  ok(R.quests.find(x => x.id === 'q4').endBy < R.quests.find(x => x.id === 'q3').endBy,
     '효도여행 마감이 뒤풀이보다 이르다');
}
