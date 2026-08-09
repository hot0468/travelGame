// 각 의뢰가 실제로 클리어 가능한지 무작위 탐색으로 확인
// 시드를 고정한다 — 실행마다 상한이 40점씩 흔들리면 par 조정의 근거가 되지 못한다.
let _seed = 0x9e3779b9;
Math.random = () => {
  _seed = _seed + 0x6D2B79F5 | 0;
  let t = Math.imul(_seed ^ _seed >>> 15, 1 | _seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const fs = require('fs'), path = require('path');
const dir = require('path').join(__dirname, '..');
global.window = global;
eval(fs.readFileSync(path.join(dir, 'data/busan.js'), 'utf8'));
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
eval(html.slice(html.indexOf('const DETOUR'), html.indexOf('// 상태')) + ';global.TRANSPORT=TRANSPORT;global.TIER_RANK=TIER_RANK;global.arrival=arrival;global.arrivalCost=arrivalCost;global.BUFFS=BUFFS;');
global.S = { region: 'busan' };
global.poi = id => REGIONS.busan.pois.find(p => p.id === id);

const ITER = +(process.env.ITER || 3000);   // 수단 최적화 패스가 붙어 회당 비용이 커서 재시작 수는 줄였다
const PAR = 0.62;   // par = 탐색 상한 × 이 값 → ★3 선이 상한의 77.5% 에 놓인다
const CEIL = 0.85;  // ★3 선이 상한의 이 비율을 넘으면 사람 손에 안 닿는다고 본다
const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
const R = REGIONS.busan;
const levelOf = q => q.lv; // 그 의뢰가 열리는 레벨에서 쓸 수 있는 장소만 사용

for (const q of R.quests) {
  const pool = R.pois;   // 장소는 레벨 제한 없이 전부 열려 있다
  const sights = pool.filter(p => p.type === 'sight' && !q.must.includes(p.id));
  const foods = pool.filter(p => p.type === 'food');
  let stayPool = pool.filter(p => p.type === 'stay');
  if (q.minStayTier) stayPool = stayPool.filter(p => TIER_RANK[p.tier] >= TIER_RANK[q.minStayTier]);
  const modes = Object.keys(TRANSPORT).filter(m => !(q.banModes || []).includes(m));

  // 한 후보의 이동수단을 구간별로 훑어 가장 좋은 것으로 바꾼다.
  // 플레이어는 수단을 굴리지 않고 고르므로, 이렇게 재야 실제 도달 가능한 점수가 나온다.
  const val = r => r.bad.length ? -1e9 - r.bad.length : r.score;   // 위반이 있으면 무조건 열세
  const polish = (plan, arriveId, wake, ret) => {
    let cur = compute({ region: 'busan', quest: q, arriveId, wake, plan, ret });
    for (let pass = 0; pass < 2; pass++) {
      let moved = false;
      for (let i = 0; i < plan.length; i++) {
        let keep = plan[i].mode;
        for (const m of modes) {
          if (m === keep) continue;
          plan[i].mode = m;
          const r = compute({ region: 'busan', quest: q, arriveId, wake, plan, ret });
          if (val(r) > val(cur)) { cur = r; keep = m; moved = true; }
        }
        plan[i].mode = keep;
      }
      if (!moved) break;
    }
    return cur;
  };

  let best = null; const why = {}; let minSpend = Infinity;
  for (let it = 0; it < ITER; it++) {
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
    const res = polish(plan, arriveId, wake, ret);
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
  // ★3 이 손에 닿는지는 "상한 이상인가"가 아니라 "상한의 몇 %인가"로 본다.
  // par 를 상한에서 역산하는 이상 st>=3 검사는 항상 참이라 아무것도 못 걸러낸다.
  const need = Math.ceil(q.par * 1.25);
  const ratio = need / best.score;                  // ★3 선이 탐색 상한의 몇 %인가
  const pass = st >= 3 && ratio <= CEIL;
  console.log(`${pass ? '✔' : '✘'} [${q.id}] ${q.title}\n   최고 ${best.score}점 / 목표 ${q.par} → ★${st}`
    + ` · ★3 선 ${need}점 = 상한의 ${(ratio * 100).toFixed(1)}%`
    + (pass ? '' : ` — 너무 빡빡(${(CEIL * 100).toFixed(0)}% 이하 권장), par 를 ${Math.round(best.score * PAR)} 로`)
    + ` · 경비 ${won(best.res.spend)}/${won(q.budget)} · 이동 ${best.res.moveMin}분`);
  console.log('   ' + q.from + '/' + R.origins[q.from].find(o=>o.id===best.arriveId).name + ' → '
    + best.plan.map(e => poi(e.id).name + '(' + TRANSPORT[e.mode].name + ')').join(' → '));
}
