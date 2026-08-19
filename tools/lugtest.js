// 짐 시스템 검증 — 짐 종류, 짐을 든 구간, 체력 배수, 수단 제한, 보관소.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
global.window = global;
['busan', 'subway', 'transit'].forEach(f => eval(fs.readFileSync(path.join(dir, 'data', f + '.js'), 'utf8')));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
eval(html.slice(html.indexOf('const DETOUR'), html.indexOf('// 상태'))
  + ';global.LUG=LUG;global.LUGGAGE=LUGGAGE;global.lugFactor=lugFactor;global.drain=drain;'
  + 'global.DRAIN_MOVE=DRAIN_MOVE;global.TRANSPORT=TRANSPORT;global.compute=compute;'
  + 'global.travel=travel;global.arrival=arrival;');
global.S = { region: 'busan' };
global.poi = id => REGIONS.busan.pois.find(p => p.id === id);
const ok = (c, m) => console.log((c ? '✔' : '✘ FAIL') + ' ' + m);
const R = REGIONS.busan;

// ── 짐 정의
ok(Object.keys(LUGGAGE).length === 3, `짐 3종 (${Object.keys(LUGGAGE).join(', ')})`);
ok(LUGGAGE.light.drain === 1, '가벼운 짐은 체력을 더 깎지 않는다');
ok(LUGGAGE.cabin.drain > 1 && LUGGAGE.large.drain > LUGGAGE.cabin.drain,
   `클수록 고되다 (${LUGGAGE.cabin.drain} < ${LUGGAGE.large.drain})`);
ok(!LUGGAGE.light.ban.length && !LUGGAGE.cabin.ban.length,
   '백팩·기내용은 못 타는 수단이 없다');
ok(LUGGAGE.large.ban.includes('bus'), '대형 캐리어는 시내버스를 못 탄다');
// 기본값 — luggage 를 안 적은 의뢰도 돌아야 한다
ok(LUG({}).drain === 1, 'luggage 를 안 적으면 가벼운 짐으로 본다');
ok(LUG(null) === LUGGAGE.light, '의뢰가 없어도 터지지 않는다');

// ── 수단별 배수. 택시는 트렁크에 싣고 끝, 도보는 그대로 진다.
{
  const q = { luggage: 'large' };
  const walk = lugFactor(q, 'walk', true), taxi = lugFactor(q, 'taxi', true);
  ok(walk > taxi, `도보가 택시보다 부담이 크다 (×${walk.toFixed(2)} vs ×${taxi.toFixed(2)})`);
  ok(lugFactor(q, 'walk', false) === 1, '짐을 맡기면 배수가 사라진다');
  ok(lugFactor({ luggage: 'light' }, 'walk', true) === 1, '가벼운 짐은 배수가 없다');
  // 배수가 지나치면 다른 페널티와 곱해져 의뢰가 불가능해진다
  ok(walk <= 1.4, `가장 큰 배수도 1.4 이하 (×${walk.toFixed(2)}) — 멀미(2배)와 겹쳐도 견딘다`);
}

// ── 의뢰마다 짐이 정해져 있다
{
  const miss = R.quests.filter(q => !q.luggage);
  ok(!miss.length, '의뢰 전부 짐이 정해져 있다' + (miss.length ? ': ' + miss.map(q => q.id) : ''));
  const bad = R.quests.filter(q => !LUGGAGE[q.luggage]);
  ok(!bad.length, '짐 종류가 모두 실재한다' + (bad.length ? ': ' + bad.map(q => q.luggage) : ''));
}

// ── 짐 보관소
{
  const lk = R.pois.filter(p => p.sub === 'locker');
  ok(lk.length >= 3, `보관소 ${lk.length}곳`);
  ok(lk.every(p => p.type === 'sight'), '보관소는 sight 타입이다(새 type 을 만들지 않았다)');
  ok(lk.every(p => p.joy === 0), '보관소는 만족도가 0 이다 — 즐거우려고 가는 곳이 아니다');
  ok(lk.every(p => p.cost > 0), '보관소는 요금이 든다');
  ok(!!R.sightTypes.locker, 'sightTypes 에 locker 가 있다');
  // 관광지 집계에 안 들어가야 한다
  const q = R.quests[0];
  const withLocker = compute({ region: 'busan', quest: q, arriveId: 'ktx', wake: {}, buffs: [], day: 0,
    plan: [{ id: lk[0].id, mode: 'subway', stay: 10 }] });
  const warns = (withLocker.warn || []).join(' ');
  ok(/관광지/.test(warns), '보관소만 넣으면 관광지가 모자라다고 경고한다: ' + (warns.match(/관광지[^,]*/) || ['?'])[0]);
}

// ── 짐을 든 구간
{
  const q = Object.assign({}, R.quests[0], { luggage: 'large', days: 2 });
  const lk = R.pois.find(p => p.sub === 'locker');
  const stay = R.pois.find(p => p.type === 'stay');
  // ① 보관소를 거치기 전까지는 짐을 들고 있다
  const r1 = compute({ region: 'busan', quest: q, arriveId: 'ktx', wake: {}, buffs: [], day: 0,
    plan: [{ id: 'haeundae', mode: 'subway', stay: 60 }, { id: lk.id, mode: 'subway', stay: 10 },
           { id: 'jagalchi', mode: 'subway', stay: 60 }] });
  const rows = r1.rows;
  ok(rows[0].carrying === true, '첫 구간은 짐을 들고 간다');
  ok(rows[1].carrying === true, '보관소로 가는 구간도 짐을 들고 간다(아직 맡기기 전)');
  ok(rows[2].carrying === false, '보관소를 거친 뒤로는 빈 몸이다');
  // ② 숙소도 짐을 내려놓는 곳이다. 단 3일 이상이어야 확인된다 —
  //    2일 의뢰는 하룻밤 자면 다음날이 곧 마지막이라 체크아웃하며 짐을 도로 든다.
  const q3 = Object.assign({}, q, { days: 3 });
  const r2 = compute({ region: 'busan', quest: q3, arriveId: 'ktx', wake: {}, buffs: [], day: 0,
    plan: [{ id: stay.id, mode: 'subway', stay: 0 }, { id: 'haeundae', mode: 'subway', stay: 60 }] });
  ok(r2.rows[0].carrying === true && r2.rows[1].carrying === false,
     '숙소에 체크인하면 그 뒤로 빈 몸이다(3일 의뢰)');
  // 마지막 날 아침에는 체크아웃하며 짐을 다시 든다
  const q2 = Object.assign({}, q, { days: 2 });
  const r3 = compute({ region: 'busan', quest: q2, arriveId: 'ktx', wake: {}, buffs: [], day: 0,
    plan: [{ id: stay.id, mode: 'subway', stay: 0 }, { id: 'haeundae', mode: 'subway', stay: 60 }] });
  ok(r3.rows[1].carrying === true, '마지막 날은 체크아웃하며 짐을 다시 든다');
}

// ── 체력이 실제로 더 깎이는가
{
  const base = Object.assign({}, R.quests[0], { days: 2 });
  const plan = [{ id: 'haeundae', mode: 'walk', stay: 60 }];
  const run = lug => compute({ region: 'busan', quest: Object.assign({}, base, { luggage: lug }),
    arriveId: 'ktx', wake: {}, buffs: [], day: 0, plan });
  const a = run('light').rows[0].dMove, b = run('large').rows[0].dMove;
  ok(b > a, `짐이 있으면 이동 체력이 더 깎인다 (${a.toFixed(1)} → ${b.toFixed(1)})`);
  ok(Math.abs(b / a - lugFactor({ luggage: 'large' }, 'walk', true)) < .01,
     '깎이는 양이 lugFactor 와 맞는다');
}
