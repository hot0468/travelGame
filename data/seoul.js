// 서울 지역 데이터 — 아직 준비 중이다(장소·의뢰가 비어 있어 선택창에서 고를 수 없다).
//
// 새 지역을 만드는 순서:
//   ① 이 파일을 채운다. data/busan.js 의 구조를 그대로 따르면 된다.
//      필수: name, sightTypes, foodTypes, ageTypes, staminaTypes, dayNames,
//            origins(출발 도시별 교통편), starts(도착 지점), pois(장소), quests(의뢰)
//      선택: mapImage(지도), subway/transit(대중교통 실측), weekendStay(주말 할증)
//   ② index.html 에 <script src="data/서울.js"></script> 한 줄을 더한다.
//   ③ 지도는 tools/mkmap.js 를 지역에 맞게 고쳐 만든다.
//      대중교통 실측이 있으면 tools/mktransit.js 로 경로표를 굽는다.
//      없으면 travel() 이 직선거리 근사로 돌아간다(real 플래그가 false 가 된다).
//   ④ 사진은 tools/mkbanner.js 로 유형별 배너부터 깔고, 실사는 admin.html 로 넣는다.
//
// 해외도 같은 방식이다. 통화·교통편만 그 나라에 맞게 쓰면 된다.
window.REGIONS = window.REGIONS || {};

REGIONS.seoul = {
  name: '서울',
  // 아래가 비어 있는 동안은 선택창에 "준비 중" 으로 뜨고 고를 수 없다.
  pois: [],
  quests: [],
};
