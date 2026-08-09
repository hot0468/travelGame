// insertAtDay + compute 조합이 "보고 있는 일차에 들어간다"를 지키는지 검증
const fs=require('fs'),path=require('path');
const dir=require('path').join(__dirname, '..');
global.window=global;
eval(fs.readFileSync(path.join(dir,'data/busan.js'),'utf8'));
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
eval(html.slice(html.indexOf('const DETOUR'), html.indexOf('// 상태')));
global.S={region:'busan',startMin:540};
global.poi=id=>REGIONS.busan.pois.find(p=>p.id===id);

// 대상 함수만 추출
const src=html.slice(html.indexOf('function insertAtDay'), html.indexOf('// 클릭할 때마다 추가'));
eval(src);

const q=REGIONS.busan.quests[3];              // 3일짜리 의뢰
S.plan=[
  {id:'taejongdae',mode:'bus',stay:120},  // 1일차
  {id:'hotel_seomyeon',mode:'bus',stay:0},// 1일차 취침
  {id:'jagalchi',mode:'bus',stay:60},     // 2일차
  {id:'hotel_seomyeon',mode:'bus',stay:0},// 2일차 취침
  {id:'beomeosa',mode:'bus',stay:90},     // 3일차
];
const ok=(c,m)=>console.log((c?'✔':'✘ FAIL')+' '+m);

[0,1,2].forEach(d=>{
  const plan=S.plan.slice();
  const i=insertAtDay(d);
  plan.splice(i,0,{id:'gukje',mode:'bus',stay:60});
  const saved=S.plan; S.plan=plan;
  const res=compute({region:'busan',quest:q,startMin:540,plan});
  S.plan=saved;
  const row=res.rows.find(r=>r.poi.id==='gukje');
  ok(row && row.day===d, `${d+1}일차 보는 중 추가 → ${row?row.day+1:'?'}일차에 들어감 (삽입위치 ${i})`);
});

// 숙소를 1일차에 추가하면 그 숙소가 1일차를 끝내고 기존 것은 2일차로 밀린다
{
  const plan=S.plan.slice(); const i=insertAtDay(0);
  plan.splice(i,0,{id:'hotel_gwangalli',mode:'bus',stay:0});
  const res=compute({region:'busan',quest:q,startMin:540,plan});
  const rows=res.rows.filter(r=>r.poi.type==='stay');
  ok(rows[0].poi.id==='hotel_gwangalli' && rows[0].day===0, '1일차에 넣은 숙소가 1일차를 마감');
  ok(rows[1].day===1, '기존 숙소는 2일차로 밀림');
}
