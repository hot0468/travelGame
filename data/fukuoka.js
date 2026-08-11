// 후쿠오카 지역 데이터. 부산과 같은 구조다(data/busan.js 참고).
//
// 통화: 요금은 모두 **원화 환산**이다(100엔 ≈ 900원 기준). 게임의 예산·정산이 원화라
// 엔으로 넣으면 won() 표시와 밸런스가 전부 어긋난다. 한국인 여행객 시점이라 이쪽이 자연스럽다.
//
// 대중교통: 후쿠오카 지하철·버스 실측 데이터가 없어 travel() 이 직선거리 근사로 돈다
// (travel().real 이 false). 지하철 3개 노선이 있지만 subway/transit 데이터를 안 넣었다 —
// 넣으려면 부산처럼 역 좌표·역간 소요시간이 필요하다.
//
// 좌표는 실제 위경도다. 요금·체류시간은 근사치이니 자유롭게 고쳐도 된다.
window.REGIONS = window.REGIONS || {};

REGIONS.fukuoka = {
  name: '후쿠오카',

  // 지도. tools/mkmap-fukuoka.js 가 국토수치정보(행정구역)로 그린다.
  // bounds 는 mapImage 가 있든 없든 반드시 있어야 한다 — px() 가 위경도를 화면
  // 좌표로 옮길 때 쓰는 범위다. SVG 도 같은 bounds·캔버스로 그려야 핀이 제자리에 온다.
  bounds: { w: 130.27, e: 130.58, n: 33.72, s: 33.47 },
  mapImage: {
    src: 'assets/fukuoka-map.svg',
    vw: 700, vh: 800,
    bounds: { w: 130.27, e: 130.58, n: 33.72, s: 33.47 },
    // 국토수치정보는 정부표준이용약관 2.0 — 상업 이용·가공 자유, CC BY 4.0 호환.
    // 출처 표시는 의무라 앱 하단에 남긴다. SA 전염은 없다.
    credit: '국토교통성', license: '국토수치정보(행정구역)',
    sourceUrl: 'https://nlftp.mlit.go.jp/ksj/',
    labels: [
      { n: '하카타', kind: 'gu', lat: 33.5920, lng: 130.4180 },
      { n: '텐진', kind: 'gu', lat: 33.5915, lng: 130.3985 },
      { n: '다자이후', kind: 'gu', lat: 33.5150, lng: 130.5250 },
      { n: '하카타만', kind: 'sea', lat: 33.6550, lng: 130.3150 },
    ],
  },

  sightTypes: {
    activity: { name: '액티비티', ico: 'ferris-wheel' },
    shopping: { name: '쇼핑', ico: 'shopping-bag' },
    nature: { name: '자연경관', ico: 'trees' },
    photo: { name: '포토스팟', ico: 'camera' },
    culture: { name: '문화', ico: 'landmark' },
  },
  foodTypes: {
    meal: { name: '식사', ico: 'utensils' },
    cafe: { name: '카페', ico: 'coffee' },
  },
  ageTypes: {
    '20대': { likes: ['activity', 'photo'], desc: '액티비티와 사진 찍기 좋은 곳을 좋아합니다' },
    '30대': { likes: ['shopping', 'photo'], desc: '쇼핑과 사진 찍기 좋은 곳을 좋아합니다' },
    '40대': { likes: ['culture', 'shopping'], desc: '전시·공연 같은 문화시설과 쇼핑을 좋아합니다' },
    '60대 이상': { likes: ['nature', 'culture'], desc: '자연경관과 차분한 문화시설을 좋아합니다' },
    '아이 동반': { likes: ['activity', 'nature'], desc: '아이들이 좋아할 체험과 자연을 찾습니다' },
  },
  staminaTypes: {
    morning: { name: '아침형', ico: 'sunrise', desc: '23시 넘겨 자면 다음날 체력 한계가 크게 준다' },
    night: { name: '야행성', ico: 'moon', desc: '새벽 4~8시 활동은 체력 소모가 1.6배' },
    energizer: { name: '에너자이저', ico: 'zap', desc: '모든 체력 소모가 30% 적다' },
    motionsick: { name: '심한 멀미', ico: 'waves', desc: '이동할 때 체력 소모가 2배' },
  },
  dayNames: ['월', '화', '수', '목', '금', '토', '일'],
  weekendStay: { days: [4, 5], rate: 1.4 },   // 금·토 체크인 할증

  // 한국에서 가는 교통편. 요금은 왕복 아닌 편도 기준(엔진이 왕복으로 계산한다).
  origins: {
    '서울': [
      { id: 'air', name: '항공', ico: 'plane', to: 'fukair', cost: 180000, per: 'person',
        arrive: 620, min: 95, drain: .12 },
      { id: 'air_late', name: '항공(오후)', ico: 'plane', to: 'fukair', cost: 145000, per: 'person',
        arrive: 840, min: 95, drain: .12 },
    ],
    '부산': [
      // 부산~하카타 고속선. 배편이라 값은 싸지만 체력을 많이 깎는다.
      { id: 'ferry', name: '고속선', ico: 'ship', to: 'hakataport', cost: 120000, per: 'person',
        arrive: 700, min: 210, drain: .18 },
      { id: 'air', name: '항공', ico: 'plane', to: 'fukair', cost: 150000, per: 'person',
        arrive: 615, min: 55, drain: .09 },
    ],
  },
  // 도착 지점
  starts: [
    { id: 'fukair', name: '후쿠오카공항', lat: 33.5859, lng: 130.4506, note: '항공' },
    { id: 'hakataport', name: '하카타항 국제터미널', lat: 33.6104, lng: 130.3947, note: '고속선' },
    { id: 'hakatastn', name: '하카타역', lat: 33.5898, lng: 130.4207, note: '신칸센·JR' },
  ],

  // ── 장소 20곳. gu 는 후쿠오카 행정구(区).
  pois: [
    // 관광 8
    { id: 'dazaifu', gu: '다자이후시', name: '다자이후 텐만구', type: 'sight', sub: 'culture',
      lat: 33.5215, lng: 130.5348, cost: 0, stay: 90, joy: 8, open: [390, 1110] },
    { id: 'kushida', gu: '하카타구', name: '쿠시다 신사', type: 'sight', sub: 'culture',
      lat: 33.5934, lng: 130.4104, cost: 0, stay: 40, joy: 6, open: [240, 1320] },
    { id: 'fuktower', gu: '사와라구', name: '후쿠오카 타워', type: 'sight', sub: 'photo',
      lat: 33.5933, lng: 130.3514, cost: 8100, stay: 60, joy: 7, open: [570, 1320] },
    { id: 'momochi', gu: '사와라구', name: '모모치 해변공원', type: 'sight', sub: 'nature',
      lat: 33.5936, lng: 130.3517, cost: 0, stay: 70, joy: 7, open: [0, 1440] },
    { id: 'ohori', gu: '주오구', name: '오호리 공원', type: 'sight', sub: 'nature',
      lat: 33.5866, lng: 130.3789, cost: 0, stay: 80, joy: 7, open: [0, 1440] },
    { id: 'canalcity', gu: '하카타구', name: '캐널시티 하카타', type: 'sight', sub: 'shopping',
      lat: 33.5897, lng: 130.4113, cost: 0, stay: 100, joy: 6, open: [600, 1320] },
    { id: 'nokonoshima', gu: '니시구', name: '노코노시마 아일랜드파크', type: 'sight', sub: 'nature',
      lat: 33.6446, lng: 130.3222, cost: 13500, stay: 150, joy: 8, open: [540, 1050] },
    { id: 'uminaka', gu: '히가시구', name: '우미노나카미치 해변공원', type: 'sight', sub: 'activity',
      lat: 33.6626, lng: 130.3494, cost: 4500, stay: 160, joy: 7, open: [570, 1050] },

    // 식당 8 — 후쿠오카는 라멘·모츠나베·명란이 유명하다
    { id: 'ichiran', gu: '주오구', name: '이치란 라멘 본점', type: 'food', sub: 'meal',
      lat: 33.5921, lng: 130.4023, cost: 9000, stay: 45, joy: 7, open: [0, 1440] },
    { id: 'shinshin', gu: '주오구', name: '하카타 신신 라멘', type: 'food', sub: 'meal',
      lat: 33.5924, lng: 130.3995, cost: 8100, stay: 45, joy: 7, open: [660, 180] },
    { id: 'motsunabe', gu: '하카타구', name: '모츠나베 오오야마', type: 'food', sub: 'meal',
      lat: 33.5895, lng: 130.4201, cost: 22500, stay: 70, joy: 8, open: [660, 1380] },
    { id: 'yatai', gu: '주오구', name: '나카스 포장마차 거리', type: 'food', sub: 'meal',
      lat: 33.5931, lng: 130.4053, cost: 18000, stay: 80, joy: 8, open: [1080, 120] },
    { id: 'mentaiju', gu: '주오구', name: '멘타이주 (명란 덮밥)', type: 'food', sub: 'meal',
      lat: 33.5885, lng: 130.4014, cost: 19800, stay: 50, joy: 7, open: [630, 1260] },
    { id: 'unagi', gu: '하카타구', name: '요시즈카 우나기야', type: 'food', sub: 'meal',
      lat: 33.6011, lng: 130.4247, cost: 36000, stay: 70, joy: 8, open: [660, 1260] },
    { id: 'starbucks_dazaifu', gu: '다자이후시', name: '다자이후 카페거리', type: 'food', sub: 'cafe',
      lat: 33.5199, lng: 130.5335, cost: 7200, stay: 40, joy: 6, open: [540, 1140] },
    { id: 'nokocafe', gu: '주오구', name: '텐진 커피스탠드', type: 'food', sub: 'cafe',
      lat: 33.5908, lng: 130.3982, cost: 6300, stay: 40, joy: 6, open: [480, 1260] },

    // 숙소 4
    { id: 'gh_hakata', gu: '하카타구', name: '하카타 게스트하우스', type: 'stay', tier: 'guesthouse',
      lat: 33.5905, lng: 130.4165, cost: 36000, stay: 0, joy: 4, open: [900, 1440] },
    { id: 'hotel_tenjin', gu: '주오구', name: '텐진 비즈니스 호텔', type: 'stay', tier: 'motel',
      lat: 33.5919, lng: 130.3975, cost: 81000, stay: 0, joy: 6, open: [900, 1440] },
    { id: 'hotel_hakata', gu: '하카타구', name: '하카타역 앞 호텔', type: 'stay', tier: 'hotel',
      lat: 33.5889, lng: 130.4219, cost: 135000, stay: 0, joy: 8, open: [900, 1440] },
    { id: 'hotel_grand', gu: '주오구', name: '그랜드 하얏트 후쿠오카', type: 'stay', tier: 'hotel',
      lat: 33.5901, lng: 130.4118, cost: 234000, stay: 0, joy: 9, open: [900, 1440] },
  ],

  // ── 의뢰 3건. par 는 tools/balance.js 로 잡은 값이다(상한의 62%).
  quests: [
    { id: 'f1', lv: 1, title: '주말 후쿠오카 · 라멘이 먹고 싶어요', from: '부산',
      desc: '부산에서 배 타고 갑니다. 라멘만 먹어도 좋아요.',
      days: 2, budget: 700000, people: 2, stamina: 110, staminaType: 'energizer',
      age: '20대', startDow: 4, must: ['ichiran'], minSights: 2, endBy: 1260, par: 130 },
    { id: 'f2', lv: 2, title: '부모님과 다자이후', from: '서울',
      desc: '부모님 모시고 갑니다. 너무 많이 걷지 않았으면 해요.',
      days: 2, budget: 1200000, people: 3, stamina: 90, staminaType: 'morning',
      age: '60대 이상', startDow: 1, must: ['dazaifu'], minSights: 3, endBy: 1200, par: 203 },
    { id: 'f3', lv: 3, title: '아이와 바다 보러', from: '서울',
      desc: '아이가 바다를 좋아해요. 뛰어놀 데가 있으면 좋겠습니다.',
      days: 3, budget: 1800000, people: 4, stamina: 100, staminaType: 'motionsick',
      age: '아이 동반', startDow: 5, must: ['uminaka'], minSights: 4, endBy: 1230, par: 250 },
  ],
};
