// 각 의뢰가 실제로 클리어 가능한지 무작위 탐색으로 확인
const fs = require('fs'), path = require('path');
const dir = require('path').join(__dirname, '..');
global.window = global;
eval(fs.readFileSync(path.join(dir, 'data/busan.js'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
eval(html.slice(html.indexOf('const DETOUR'), html.indexOf('// 상태')) + ';global.TRANSPORT=TRANSPORT;global.TIER_RANK=TIER_RANK;global.arrival=arrival;global.arrivalCost=arrivalCost;global.BUFFS=BUFFS;');
global.S = { region: 'busan' };
global.poi = id => REGIONS.busan.pois.find(p => p.id === id);

const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
const R = REGIONS.busan;
const levelOf = q => q.lv; // 그 의뢰가 열리는 레벨에서 쓸 수 있는 장소만 사용

for (const q of R.quests) {
  const pool = R.pois;   // 장소는 레벨 제한 없이 전부 열려 있다
  const sights = pool.filter(p => p.type === 'sight' && !q.must.includes(p.id));
  const foods = pool.filter(p => p.type === 'food');
  let stayPool = pool.filter(p => p.type === 'stay');
  if (q.minStayTier) stayPool = stayPool.filter(p => TIER_RANK[p.tier] >= TIER_RANK[q.minStayTier]);
  const modes = (['bus', 'taxi', 'car']).filter(m => !(q.banModes || []).includes(m));

  let best = null; const why = {}; let minSpend = Infinity;
  for (let it = 0; it < 40000; it++) {
    const pick = [...q.must.map(id => poi(id))];
    const nS = q.minSights - pick.filter(p => p.type === 'sight').length;
    const pS = [...sights].sort(() => Math.random() - .5).slice(0, Math.max(0, nS + (Math.random() < .3 ? 1 : 0)));
    const pF = [...foods].sort(() => Math.random() - .5).slice(0, q.days + (Math.random() < .5 ? 0 : 1));
    let all = [...pick, ...pS, ...pF].sort(() => Math.random() - .5);
    // 숙소를 하루 끝마다 끼워넣기
    // 연박 허용: 매일 독립적으로 뽑음
    const stays = Array.from({ length: q.days - 1 }, () => stayPool[Math.random() * stayPool.length | 0]);
    const per = Math.ceil(all.length / q.days);
    const plan = [];
    for (let d = 0; d < q.days; d++) {
      plan.push(...all.slice(d * per, (d + 1) * per).map(p => ({ id: p.id, mode: modes[Math.random() * modes.length | 0], stay: p.stay })));
      if (d < q.days - 1 && stays[d]) plan.push({ id: stays[d].id, mode: modes[Math.random() * modes.length | 0], stay: 0 });
    }
    if (!plan.length || poi(plan.at(-1).id).type === 'stay') continue;
    // 시작지점도 플레이어의 선택지 (의뢰가 고정했으면 startPoint()가 무시함)
    const opts = R.origins[q.from];
    const arriveId = opts[Math.random() * opts.length | 0].id;
    // 기상 시각도 플레이어의 선택지 (늦게 일어나면 체력은 차지만 관광 시간이 준다)
    const wake = {};
    for (let d = 1; d < q.days; d++) wake[d] = 360 + (Math.random() * 8 | 0) * 30;
    const ret = { mode: modes[Math.random() * modes.length | 0] };   // 귀가 수단도 선택지
    const res = compute({ region: 'busan', quest: q, arriveId, wake, plan, ret });
    res.bad.forEach(m => { const k = m.replace(/[\d,]+원?/g, 'N').split(':')[0]; why[k] = (why[k] || 0) + 1; });
    minSpend = Math.min(minSpend, res.spend);
    if (!res.bad.length && (!best || res.score > best.score)) best = { score: res.score, res, plan, arriveId, wake };
  }
  if (!best) {
    console.error(`✘ [${q.id}] ${q.title} — 유효한 일정을 못 찾음`);
    console.error(`   최저 경비 ${won(minSpend)} / 예산 ${won(q.budget)}`);
    console.error('   실패 사유 상위: ' + Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}(${v})`).join(', '));
    continue;
  }
  const st = stars(best.score, q.par);
  console.log(`✔ [${q.id}] ${q.title}\n   최고 ${best.score}점 / 목표 ${q.par} → ★${st} · 경비 ${won(best.res.spend)}/${won(q.budget)} · 이동 ${best.res.moveMin}분`);
  console.log('   ' + q.from + '/' + R.origins[q.from].find(o=>o.id===best.arriveId).name + ' → '
    + best.plan.map(e => poi(e.id).name + '(' + TRANSPORT[e.mode].name + ')').join(' → '));
}
