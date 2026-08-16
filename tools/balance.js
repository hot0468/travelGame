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
// 지역을 인자로 받는다: node tools/balance.js [지역id]. 없으면 부산.
const REGION = process.argv.slice(2).find(a => !a.startsWith('-')) || 'busan';
// 지역 파일은 이름이 곧 id 다(data/busan.js → REGIONS.busan).
['busan', REGION].filter((v, i, a) => a.indexOf(v) === i).forEach(r => {
  const f = path.join(dir, 'data/' + r + '.js');
  if (!fs.existsSync(f)) { console.error('data/' + r + '.js 가 없다'); process.exit(1); }
  eval(fs.readFileSync(f, 'utf8'));
  // 지하철·경로표 같은 딸린 파일도 함께 읽는다(data/<지역>-*.js).
  // -subway 를 맨 앞으로 — 니시테츠·JR 은 subway 구조에 노선을 더하는 파일이라 그 뒤여야 한다.
  // 알파벳순(jr < nishitetsu < subway)으로 읽으면 조용히 빠져서 전부 직선 근사로 돌게 된다.
  fs.readdirSync(path.join(dir, 'data')).filter(x => x.startsWith(r + '-'))
    .sort((a, b) => (a.includes('-subway') ? 0 : 1) - (b.includes('-subway') ? 0 : 1))
    .forEach(x => eval(fs.readFileSync(path.join(dir, 'data', x), 'utf8')));
});
if (!REGIONS[REGION]) { console.error(REGION + ' 지역을 못 찾았다'); process.exit(1); }
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
eval(html.slice(html.indexOf('const DETOUR'), html.indexOf('// 상태')) + ';global.TRANSPORT=TRANSPORT;global.TIER_RANK=TIER_RANK;global.arrival=arrival;global.arrivalCost=arrivalCost;global.BUFFS=BUFFS;global.tripsOf=tripsOf;');
global.S = { region: REGION };
global.poi = id => REGIONS[REGION].pois.find(p => p.id === id);

const ITER = +(process.env.ITER || 3000);   // 수단 최적화 패스가 붙어 회당 비용이 커서 재시작 수는 줄였다
const PAR = 0.62;   // par = 탐색 상한 × 이 값 → ★3 선이 상한의 77.5% 에 놓인다
const CEIL = 0.85;  // ★3 선이 상한의 이 비율을 넘으면 사람 손에 안 닿는다고 본다
const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
const R = REGIONS[REGION];
const levelOf = q => q.lv; // 그 의뢰가 열리는 레벨에서 쓸 수 있는 장소만 사용

const ONLY = process.env.QUEST;   // QUEST=q4 로 한 의뢰만 길게 돌려 볼 수 있다
for (const q of R.quests) {
  if (ONLY && q.id !== ONLY) continue;
  const pool = R.pois;   // 장소는 레벨 제한 없이 전부 열려 있다
  const sights = pool.filter(p => p.type === 'sight' && !q.must.includes(p.id));
  const foods = pool.filter(p => p.type === 'food');
  let stayPool = pool.filter(p => p.type === 'stay');
  if (q.minStayTier) stayPool = stayPool.filter(p => TIER_RANK[p.tier] >= TIER_RANK[q.minStayTier]);
  const modes = Object.keys(TRANSPORT).filter(m => !(q.banModes || []).includes(m));

  // 한 후보의 이동수단을 구간별로 훑어 가장 좋은 것으로 바꾼다.
  // 플레이어는 수단을 굴리지 않고 고르므로, 이렇게 재야 실제 도달 가능한 점수가 나온다.
  // 위반이 있으면 무조건 열세. warn(필수 코스 누락·마감 초과 등)은 제출은 되지만 별이 0 이라
  // 상한 탐색에서는 bad 와 똑같이 실격으로 봐야 한다 — 안 그러면 조건을 버린 일정이 상한을 만든다.
  const nBad = r => r.bad.length + r.warn.length;
  const val = r => nBad(r) ? -1e9 - nBad(r) : r.score;
  // sel.dep 은 예매한 편의 출발 시각 — 폴리시 안에서 함께 최적화하고 호출자에게 돌려준다.
  const polish = (plan, arriveId, sel, wake, ret) => {
    const opt = R.origins[q.from].find(o => o.id === arriveId);
    const deps = tripsOf(R, opt).map(t => t.dep);
    let cur = compute({ region: REGION, quest: q, arriveId, depMin: sel.dep, wake, plan, ret });
    for (let pass = 0; pass < 2; pass++) {
      let moved = false;
      // 어느 편을 끊느냐로 첫날 길이와 요금이 같이 움직인다 — 수단보다 먼저 훑는다
      for (const dep of deps) {
        if (dep === sel.dep) continue;
        const r = compute({ region: REGION, quest: q, arriveId, depMin: dep, wake, plan, ret });
        if (val(r) > val(cur)) { cur = r; sel.dep = dep; moved = true; }
      }
      for (let i = 0; i < plan.length; i++) {
        let keep = plan[i].mode;
        for (const m of modes) {
          if (m === keep) continue;
          plan[i].mode = m;
          const r = compute({ region: REGION, quest: q, arriveId, depMin: sel.dep, wake, plan, ret });
          if (val(r) > val(cur)) { cur = r; keep = m; moved = true; }
        }
        plan[i].mode = keep;
      }
      // 같은 날 이웃한 두 곳의 순서를 바꿔 본다. 조합(pairs)은 이어 붙였을 때만 붙으므로
      // 순서를 안 훑으면 상한이 과소평가된다. 숙소는 날짜 경계라 자리를 지킨다.
      for (let i = 0; i + 1 < plan.length; i++) {
        if (poi(plan[i].id).type === 'stay' || poi(plan[i + 1].id).type === 'stay') continue;
        const sw = () => { const t = plan[i]; plan[i] = plan[i + 1]; plan[i + 1] = t; };
        sw();
        const r = compute({ region: REGION, quest: q, arriveId, depMin: sel.dep, wake, plan, ret });
        if (val(r) > val(cur)) { cur = r; moved = true; } else sw();
      }
      if (!moved) break;
    }
    return cur;
  };

  const PJ = R.pairs || [];
  let best = null; const why = {}; let minSpend = Infinity;
  for (let it = 0; it < ITER; it++) {
    // 숙소형 must(온천 료칸 등)는 낮 일정이 아니라 밤 슬롯에 앉혀야 한다 —
    // 관광 목록에 섞으면 숙소=취침이라 하루가 그 자리에서 쪼개져 전 반복이 위반으로 죽는다.
    const mustAll = q.must.map(id => poi(id));
    const mustStay = mustAll.filter(p => p.type === 'stay');
    const pick = mustAll.filter(p => p.type !== 'stay');
    const nS = q.minSights - pick.filter(p => p.type === 'sight').length;
    const pS = [...sights].sort(() => Math.random() - .5).slice(0, Math.max(0, nS + (Math.random() < .3 ? 1 : 0)));
    const pF = [...foods].sort(() => Math.random() - .5).slice(0, q.days + (Math.random() < .5 ? 0 : 1));
    let all = [...pick, ...pS, ...pF].sort(() => Math.random() - .5);
    // 조합을 아는 사람은 짝을 함께 넣고 이어서 돈다. 무작위로만 뽑으면 33쌍 중 하나도 안 걸려
    // 상한이 조합 없는 점수로 잡히고, 그러면 par 가 헐거워져 아는 사람에게 ★3 이 공짜가 된다.
    if (Math.random() < .7) {
      const have = new Set(all.map(p => p.id));
      let added = 0;                               // 한쪽만 있으면 짝을 데려온다 —
      for (const pr of PJ) {                       // 무제한이면 일정이 비대해져 체력·예산에서 다 죽는다
        if (added >= 2) break;
        const solo = have.has(pr.a) ? pr.b : have.has(pr.b) ? pr.a : null;
        if (solo && !have.has(solo) && Math.random() < .5) { all.push(poi(solo)); have.add(solo); added++; }
      }
      for (let i = 0; i < all.length; i++) {       // 짝을 바로 뒤로 끌어와 붙인다
        const pr = PJ.find(x => x.a === all[i].id || x.b === all[i].id);
        if (!pr) continue;
        const other = pr.a === all[i].id ? pr.b : pr.a;
        const j = all.findIndex((p, k) => k > i + 1 && p.id === other);
        if (j > 0) { all.splice(i + 1, 0, all.splice(j, 1)[0]); i++; }
      }
    }
    // 숙소를 하루 끝마다 끼워넣기
    // 연박 허용: 매일 독립적으로 뽑음
    const stays = Array.from({ length: q.days - 1 },
      (_, d) => mustStay[d] || stayPool[Math.random() * stayPool.length | 0]);
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
    // 예매 시간대도 플레이어의 선택지 (새벽편은 첫날이 길지만 25% 비싸다)
    const trips = tripsOf(R, opts.find(o => o.id === arriveId));
    const sel = { dep: trips[Math.random() * trips.length | 0].dep };
    // 기상 시각도 플레이어의 선택지 (늦게 일어나면 체력은 차지만 관광 시간이 준다)
    const wake = {};
    for (let d = 1; d < q.days; d++) wake[d] = 360 + (Math.random() * 8 | 0) * 30;
    const ret = { mode: modes[Math.random() * modes.length | 0] };   // 귀가 수단도 선택지
    const res = polish(plan, arriveId, sel, wake, ret);
    res.bad.concat(res.warn).forEach(m => { const k = m.replace(/[\d,]+원?/g, 'N').split(':')[0]; why[k] = (why[k] || 0) + 1; });
    minSpend = Math.min(minSpend, res.spend);
    if (!nBad(res) && (!best || res.score > best.score)) best = { score: res.score, res, plan, arriveId, dep: sel.dep, wake };
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
  const bo = R.origins[q.from].find(o => o.id === best.arriveId);
  const bt = tripsOf(R, bo).find(t => t.dep === best.dep) || { no: '?', slot: { name: '?' } };
  console.log('   ' + q.from + '/' + bo.name + ' ' + bt.slot.name + '편(' + bt.no + ') → '
    + best.plan.map(e => poi(e.id).name + '(' + TRANSPORT[e.mode].name + ')').join(' → '));
}
