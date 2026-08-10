// 조합(pairs) 규칙과 bad/warn 분리 검증
const fs = require('fs'), path = require('path');
const dir = require('path').join(__dirname, '..');
global.window = global;
eval(fs.readFileSync(path.join(dir, 'data/busan.js'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
eval(html.slice(html.indexOf('const DETOUR'), html.indexOf('// 상태'))
  + ';global.TRANSPORT=TRANSPORT;global.arrival=arrival;global.DAY_START=DAY_START;global.TIER_RANK=TIER_RANK;');
global.S = { region: 'busan' };
global.poi = id => REGIONS.busan.pois.find(p => p.id === id);
const ok = (c, m) => console.log((c ? '✔' : '✘ FAIL') + ' ' + m);
const R = REGIONS.busan;

// ── 데이터 무결성
{
  const ids = new Set(R.pois.map(p => p.id));
  const dangling = R.pairs.filter(p => !ids.has(p.a) || !ids.has(p.b));
  ok(!dangling.length, `조합 ${R.pairs.length}쌍의 장소 id 가 모두 실재함` + (dangling.length ? ` — ${dangling[0].a}/${dangling[0].b}` : ''));
  const seen = new Set(), dup = [];
  R.pairs.forEach(p => { const k = [p.a, p.b].sort().join('|'); if (seen.has(k)) dup.push(k); seen.add(k); });
  ok(!dup.length, '중복된 조합 없음' + (dup.length ? ` — ${dup[0]}` : ''));
  ok(R.pairs.every(p => p.joy > 0 && p.say), '모든 조합에 joy 와 대사가 있음');
  ok(R.pairs.every(p => p.a !== p.b), '자기 자신과 짝지은 조합 없음');
}

// ── 성립 조건
// 감천문화마을 · 흰여울문화마을 (+9) 로 잰다. 2일 의뢰라 숙소 한 곳이 필요하다.
const q = Object.assign({}, R.quests[0], { must: [], minSights: 0 });
const PAIR = R.pairs.find(p => p.a === 'gamcheon' && p.b === 'huinyeoul');
const run = plan => compute({ region: 'busan', quest: q, arriveId: 'ktx', plan, ret: { mode: 'taxi' } });
const P = (id, stay) => ({ id, mode: 'taxi', stay: stay ?? poi(id).stay });

{
  const apart = run([P('gamcheon'), P('jagalchi'), P('huinyeoul')]);
  const next = run([P('gamcheon'), P('huinyeoul'), P('jagalchi')]);
  ok(next.pairHit.length === 1 && !apart.pairHit.length, '이어 붙였을 때만 성립 (사이에 다른 곳이 끼면 무효)');
  ok(next.joy - apart.joy === PAIR.joy, `조합 만족도가 정확히 +${PAIR.joy} (${apart.joy} → ${next.joy})`);

  const rev = run([P('huinyeoul'), P('gamcheon'), P('jagalchi')]);
  ok(rev.pairHit.length === 1, '순서를 뒤집어도 성립 (조합은 방향을 안 가림)');

  // 같은 조합을 두 번 붙여도 만족도는 한 번만 붙는다
  const twice = run([P('gamcheon'), P('huinyeoul'), P('gamcheon'), P('huinyeoul')]);
  ok(twice.pairHit.length === 1, '같은 조합을 반복해도 한 번만 인정');

  // 숙소를 사이에 두면 날이 갈리므로 이어 붙인 게 아니다
  const overnight = run([P('gamcheon'), P('gh_nampo', 0), P('huinyeoul')]);
  ok(!overnight.pairHit.length, '하루 자고 난 뒤는 성립하지 않음');
}

// ── bad(제출 차단) 와 warn(제출 허용) 의 분리
{
  // 필수 코스를 빼면 warn 이지 bad 가 아니다 — 위험을 알고도 낼 수 있어야 한다.
  const q2 = Object.assign({}, R.quests[0], { must: ['haeundae'], minSights: 3 });
  const miss = compute({ region: 'busan', quest: q2, arriveId: 'ktx', ret: { mode: 'taxi' },
    plan: [P('gamcheon'), P('gh_nampo', 0), P('jagalchi')] });
  ok(miss.warn.some(m => m.includes('필수 코스')), '필수 코스 누락은 warn: ' + (miss.warn.find(m => m.includes('필수 코스')) || '없음'));
  ok(!miss.bad.length, '필수 코스가 빠져도 제출은 막히지 않음');

  // 영업 종료 뒤 도착은 물리적으로 불가능하므로 bad 다.
  const shut = compute({ region: 'busan', quest: q, arriveId: 'ktx', ret: { mode: 'taxi' },
    plan: [P('haeundae', 1200), P('gamcheon')] });
  ok(shut.bad.length > 0, '영업시간을 못 맞추면 bad(제출 차단): ' + (shut.bad[0] || '없음'));

  // 예산 초과도 warn — 감점만으로는 "예산 버리고 많이 넣기" 를 못 막는다.
  const q3 = Object.assign({}, R.quests[0], { budget: 1000 });
  const bust = compute({ region: 'busan', quest: q3, arriveId: 'ktx', plan: [P('gamcheon')], ret: { mode: 'taxi' } });
  ok(bust.warn.some(m => m.includes('예산 초과')), '예산 초과는 warn');
  ok(!bust.bad.some(m => m.includes('예산 초과')), '예산 초과가 제출을 막지는 않음');
}

// ── 조합이 이동시간과 겨룰 만큼의 폭인가
// 조합 하나가 +6 이상이면 10점 환산으로 60점 — 이동 60분과 맞먹는다.
{
  const weak = R.pairs.filter(p => p.joy < 6);
  ok(!weak.length, '모든 조합이 이동 60분 이상의 값어치 (joy ≥ 6)' + (weak.length ? ` — ${weak[0].a}/${weak[0].b} ${weak[0].joy}` : ''));
}
