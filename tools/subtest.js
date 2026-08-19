// 연령대 선호가 만족도에 반영되는지 검증
const fs=require('fs'),path=require('path');
const dir=require('path').join(__dirname, '..');
global.window=global;
eval(fs.readFileSync(path.join(dir,'data/busan.js'),'utf8'));
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
eval(html.slice(html.indexOf('const DETOUR'), html.indexOf('// 상태'))+';global.likesSub=likesSub;');
global.S={region:'busan'};
global.poi=id=>REGIONS.busan.pois.find(p=>p.id===id);
const ok=(c,m)=>console.log((c?'✔':'✘ FAIL')+' '+m);
const R=REGIONS.busan, base=R.quests[0];

// 모든 관광지에 세부 타입이 있는가
const sights=R.pois.filter(p=>p.type==='sight');
ok(sights.every(p=>R.sightTypes[p.sub]), `관광지 ${sights.length}곳 모두 세부 타입 보유`);
ok(R.quests.every(q=>R.ageTypes[q.age]), '의뢰 5개 모두 연령대 보유');

// 액티비티 한 곳을 20대(액티비티 선호)와 30대(비선호)로 비교
const one=[{id:'lotteworld',mode:'taxi',stay:120}];   // activity
const run=(age)=>compute({region:'busan',quest:Object.assign({},base,{age}),arriveId:'ktx',plan:one,buffs:[]});
const a20=run('20대'), a30=run('30대');
ok(a20.joy === a30.joy + 3, `액티비티: 20대 ${a20.joy} = 30대 ${a30.joy} +3`);

// 쇼핑은 반대
const shop=[{id:'centum',mode:'taxi',stay:90}];       // shopping
const s20=compute({region:'busan',quest:Object.assign({},base,{age:'20대'}),arriveId:'ktx',plan:shop,buffs:[]});
const s30=compute({region:'busan',quest:Object.assign({},base,{age:'30대'}),arriveId:'ktx',plan:shop,buffs:[]});
ok(s30.joy === s20.joy + 3, `쇼핑: 30대 ${s30.joy} = 20대 ${s20.joy} +3`);

// 식당·숙소에는 선호 보너스가 붙지 않는다
const food=[{id:'galbi',mode:'taxi',stay:90}];
const f20=compute({region:'busan',quest:Object.assign({},base,{age:'20대'}),arriveId:'ktx',plan:food,buffs:[]});
const f60=compute({region:'busan',quest:Object.assign({},base,{age:'60대 이상'}),arriveId:'ktx',plan:food,buffs:[]});
ok(f20.joy === f60.joy, `식당은 연령대 무관 (${f20.joy})`);

// likesSub 판정
ok(likesSub(R.quests[4], poi('lotteworld')) && !likesSub(R.quests[4], poi('centum')),
   '아이 동반: 액티비티 선호, 쇼핑 비선호');
ok(!likesSub(R.quests[3], poi('lotteworld')) && likesSub(R.quests[3], poi('taejongdae')),
   '60대 이상: 자연경관 선호, 액티비티 비선호');

// 연령대별로 최적 관광지 조합이 달라진다 (같은 4곳을 두 연령대가 다르게 평가)
// 문화: 40대(선호)와 20대(비선호)
{
  const cul = [{ id: 'cinecenter', mode: 'taxi', stay: 120 }];
  const mk = age => compute({ region: 'busan', quest: Object.assign({}, base, { age }), arriveId: 'ktx', plan: cul, buffs: [] });
  const c40 = mk('40대'), c20 = mk('20대');
  ok(c40.joy === c20.joy + 3, '문화: 40대 ' + c40.joy + ' = 20대 ' + c20.joy + ' +3');
  const culture = R.pois.filter(p => p.sub === 'culture');
  ok(culture.length >= 5, '문화시설 ' + culture.length + '곳 (' + culture.slice(0, 3).map(p => p.name).join(', ') + ' …)');
  // locker(짐 보관)는 선호 대상이 아니다 — 즐거우려고 가는 곳이 아니라
  // 다음 이동을 가볍게 하려고 들르는 곳이라 joy 도 0 이다.
  const kinds = Object.keys(R.sightTypes).filter(k => k !== 'locker');
  const liked = new Set(Object.values(R.ageTypes).flatMap(a => a.likes));
  ok(kinds.every(k => liked.has(k)), '세부타입 ' + kinds.length + '종 모두 선호하는 연령대가 있음(짐 보관 제외)');
}
// 액티비티2 + 포토2 로 20대에 치우친 코스 (40대는 하나도 안 맞는다)
const mixed=['lotteworld','aquarium','gwangalli','gamcheon'].map(id=>({id,mode:'taxi',stay:60}));
const m20=compute({region:'busan',quest:Object.assign({},base,{age:'20대'}),arriveId:'ktx',plan:mixed,buffs:[]}).joy;
const m40=compute({region:'busan',quest:Object.assign({},base,{age:'40대'}),arriveId:'ktx',plan:mixed,buffs:[]}).joy;
ok(m20 === m40 + 12, `같은 코스도 연령대별 평가가 다름 (20대 ${m20} vs 40대 ${m40})`);
