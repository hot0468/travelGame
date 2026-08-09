// 체력 규칙 검증: 타입별 소모 차이, 수면 부족 페널티, 기상 시각 반영
const fs=require('fs'),path=require('path');
const dir=require('path').join(__dirname, '..');
global.window=global;
eval(fs.readFileSync(path.join(dir,'data/busan.js'),'utf8'));
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
eval(html.slice(html.indexOf('const DETOUR'), html.indexOf('// 상태'))
     +';global.TRANSPORT=TRANSPORT;global.arrival=arrival;global.DAY_START=DAY_START;');
global.S={region:'busan'};
global.poi=id=>REGIONS.busan.pois.find(p=>p.id===id);
const ok=(c,m)=>console.log((c?'✔':'✘ FAIL')+' '+m);
const R=REGIONS.busan;

// 같은 일정을 타입만 바꿔 돌린다
const base=JSON.parse(JSON.stringify(R.quests[0]));
const plan=[{id:'gamcheon',mode:'bus',stay:120},{id:'haeundae',mode:'bus',stay:90}];
const run=(over)=>compute({region:'busan',quest:Object.assign({},base,over),arriveId:'ktx',plan});

const norm=run({staminaType:'morning'}), ener=run({staminaType:'energizer'}), sick=run({staminaType:'motionsick'});
ok(ener.dayStat[0].low > norm.dayStat[0].low, `에너자이저가 덜 지침 (${ener.dayStat[0].low.toFixed(1)} > ${norm.dayStat[0].low.toFixed(1)})`);
ok(sick.dayStat[0].low < norm.dayStat[0].low, `멀미형이 더 지침 (${sick.dayStat[0].low.toFixed(1)} < ${norm.dayStat[0].low.toFixed(1)})`);

// 이동수단만 바꾸면 멀미형에서 차이가 더 크게 벌어진다
const byMode=(t,m)=>run({staminaType:t}).dayStat[0].low - compute({region:'busan',quest:Object.assign({},base,{staminaType:t}),arriveId:'ktx',
  plan:[{id:'gamcheon',mode:m,stay:120},{id:'haeundae',mode:m,stay:90}]}).dayStat[0].low;
ok(Math.abs(byMode('motionsick','taxi')) > Math.abs(byMode('morning','taxi')), '멀미형은 이동수단에 더 민감');

// 야행성: 새벽에 걸치면 소모가 커진다 (2일차 기상을 04:30 로)
const q2=Object.assign({},R.quests[1]);
const late=(wake,type)=>compute({region:'busan',quest:Object.assign({},q2,{staminaType:type}),arriveId:'ktx',
  wake:{1:wake},
  plan:[{id:'jagalchi',mode:'bus',stay:60},{id:'gh_nampo',mode:'bus',stay:0},{id:'gamcheon',mode:'bus',stay:120}]});
const nEarly=late(270,'night').dayStat[1], nLate=late(600,'night').dayStat[1];
const mEarly=late(270,'energizer').dayStat[1], mLate=late(600,'energizer').dayStat[1];
const nDrop=nEarly.cap-nEarly.low, nDrop2=nLate.cap-nLate.low;
ok(nDrop > nDrop2, `야행성은 새벽 활동에서 더 깎임 (04:30 -${nDrop.toFixed(1)} vs 10:00 -${nDrop2.toFixed(1)})`);

// 수면 부족 → 다음날 한계 감소
const night=(wake)=>compute({region:'busan',quest:Object.assign({},q2,{staminaType:'energizer'}),arriveId:'ktx',wake:{1:wake},
  plan:[{id:'jagalchi',mode:'bus',stay:700},{id:'gh_nampo',mode:'bus',stay:0},{id:'gamcheon',mode:'bus',stay:60}]});
const sleepy=night(300).dayStat[1], rested=night(600).dayStat[1];
ok(sleepy.cap < rested.cap, `수면 부족 시 다음날 체력 한계 감소 (${sleepy.cap} < ${rested.cap})`);
ok(sleepy.sleep < rested.sleep, `수면 시간 계산 (${Math.round(sleepy.sleep/60)}h < ${Math.round(rested.sleep/60)}h)`);

// 아침형: 늦게 자면 같은 수면시간이라도 한계가 더 깎인다
const bedLate=(type)=>compute({region:'busan',quest:Object.assign({},q2,{staminaType:type}),arriveId:'ktx',wake:{1:600},
  plan:[{id:'haeundae',mode:'bus',stay:800},{id:'gh_nampo',mode:'bus',stay:0},{id:'gamcheon',mode:'bus',stay:60}]});
const mm=bedLate('morning').dayStat[1], ee=bedLate('night').dayStat[1];
ok(mm.cap < ee.cap, `아침형이 늦게 자면 더 손해 (아침형 ${mm.cap} < 야행성 ${ee.cap}, 취침 ${Math.floor(mm.bed%1440/60)}시)`);

// 체력 소진은 위반으로 잡힌다
const hard=compute({region:'busan',quest:Object.assign({},R.quests[3]),arriveId:'ktx',
  plan:Array.from({length:6},()=>({id:'beomeosa',mode:'bus',stay:200}))});
ok(hard.bad.some(m=>m.includes('체력 소진')), '체력 소진 감지');
