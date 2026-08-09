// 버프 9종이 실제로 효과를 내는지: 같은 일정을 버프 유무로 돌려 비교
const fs=require('fs'),path=require('path');
const dir=require('path').join(__dirname, '..');
global.window=global;
eval(fs.readFileSync(path.join(dir,'data/busan.js'),'utf8'));
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
eval(html.slice(html.indexOf('const DETOUR'), html.indexOf('// 상태'))
  +';global.BUFFS=BUFFS;global.arrival=arrival;');
global.S={region:'busan'};
global.poi=id=>REGIONS.busan.pois.find(p=>p.id===id);
const ok=(c,m)=>console.log((c?'✔':'✘ FAIL')+' '+m);
const R=REGIONS.busan, q=R.quests[3];   // 3일 · 4인 · 호텔

const run=(plan,buffs,extra)=>compute(Object.assign({region:'busan',quest:q,arriveId:'ktx',plan,buffs:buffs||[]},extra));
const PLAN=[
  {id:'taejongdae',mode:'taxi',stay:120},{id:'hoe',mode:'bus',stay:80},
  {id:'hotel_gwangalli',mode:'bus',stay:0},
  {id:'gamcheon',mode:'bus',stay:120},{id:'dwaeji',mode:'bus',stay:50},
  {id:'hotel_gwangalli',mode:'car',stay:0},
  {id:'beomeosa',mode:'bus',stay:90}];
const base=run(PLAN);

const cheaper=(id)=>{const b=run(PLAN,[id]);return {d:base.spend-b.spend,v:b};};
ok(cheaper('hotelclub').d > 0,      `제휴 호텔: -${cheaper('hotelclub').d.toLocaleString()}원`);
ok(cheaper('transitpass').d > 0,    `교통패스: -${cheaper('transitpass').d.toLocaleString()}원`);
ok(cheaper('groupticket').d > 0,    `단체 입장권: -${cheaper('groupticket').d.toLocaleString()}원`);
ok(cheaper('rentalclub').d > 0,     `렌터카 멤버십: -${cheaper('rentalclub').d.toLocaleString()}원`);
ok(cheaper('taxicoupon').d > 0,     `택시 쿠폰: -${cheaper('taxicoupon').d.toLocaleString()}원`);

ok(run(PLAN,['foodie']).joy === base.joy + 2*2, `미식가: 만족도 ${base.joy} → ${run(PLAN,['foodie']).joy}`);
ok(run(PLAN,['guide']).joy === base.joy + 3,    `현지 가이드: 만족도 ${base.joy} → ${run(PLAN,['guide']).joy}`);

const c0=base.dayStat[0].low, c1=run(PLAN,['comfyseat']).dayStat[0].low;
ok(c1 > c0, `편안한 좌석: 1일차 최저체력 ${c0.toFixed(1)} → ${c1.toFixed(1)}`);

// 숙면 안대: 6.5~8시간 사이로 자야 차이가 난다 (밤늦게 자고 새벽에 기상)
{
  const late=[{id:'haeundae',mode:'taxi',stay:700},{id:'hotel_gwangalli',mode:'taxi',stay:0},
              {id:'gamcheon',mode:'taxi',stay:60},{id:'hotel_gwangalli',mode:'taxi',stay:0},
              {id:'beomeosa',mode:'taxi',stay:60}];
  const w={1:300,2:300};
  const a0=run(late,[],{wake:w}).dayStat[1], a1=run(late,['sleepwell'],{wake:w}).dayStat[1];
  ok(a1.cap > a0.cap, `숙면 안대: 수면 ${Math.floor(a0.sleep/60)}시간${a0.sleep%60}분에 체력한계 ${a0.cap} → ${a1.cap}`);
}

// 교통패스 상한이 정확히 하루 6,000원인지
{
  const many=[{id:'jagalchi',mode:'bus',stay:30},{id:'gukje',mode:'bus',stay:30},
              {id:'biff',mode:'bus',stay:30},{id:'yongdusan',mode:'bus',stay:30},
              {id:'dwaeji',mode:'bus',stay:30}];
  const a=run(many), b=run(many,['transitpass']);
  const legs=a.rows.reduce((s,r)=>s+r.leg.cost,0);
  ok(a.spend-b.spend === Math.max(0,legs-6000), `상한 정확: 실제 교통비 ${legs.toLocaleString()} → 6,000원 부과`);
}
// 버프 없으면 아무 변화 없어야 한다
ok(run(PLAN,[]).spend === base.spend && run(PLAN,['없는버프']).spend === base.spend, '알 수 없는 버프는 무시');
