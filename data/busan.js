// 부산 지역 데이터. 지역 추가 = 이 파일 복사해서 REGIONS.xxx 로 등록 + index.html 에 script 태그 한 줄.
// 좌표는 실제 위경도. 요금/체류시간은 근사치이니 자유롭게 수정.
window.REGIONS = window.REGIONS || {};

REGIONS.busan = {
  name: '부산',
  // 실제 행정구역 지도. 이게 있으면 배경으로 깔고 투영도 여기 bounds 를 따름.
  // bounds 는 이미지 네 모서리의 위경도 — 핀이 어긋나면 이 네 값만 만지면 됨.
  // 출처: 통계청 2018 센서스용 행정구역경계. tools/mkmap.js 가 구·군 경계만 뽑아 그린다.
  // 지명은 아래 labels 로 게임이 직접 그린다(원본에는 글자가 없다).
  //       확대하면 이미지에 박힌 글자까지 같이 커져 화면을 덮으므로, 지명은 아래 labels 로
  //       분리해 게임이 직접 그린다(배율과 무관하게 항상 같은 크기).
  //       labels 좌표는 원본의 글자 위치를 픽셀 단위로 추출한 값이라 배치가 원본과 동일함.
  mapImage: {
    src: 'assets/busan-map-kostat.svg',
    vw: 852.411, vh: 822.913,          // 원본 SVG 캔버스 크기
    // 보정 근거: 기장 북단(y=6px)=35.3866, 영도 남단 태종대(y=692px)=35.0517 두 점으로
    // 위도 축척 2048.4px/° 산출. 경도 축척은 그 × cos(35.1°)=1675.6px/° (정합오차 <500m).
    bounds: { w: 128.7946, e: 129.3033, n: 35.3895, s: 34.9878 },
    // 통계청 센서스용 행정구역경계로 tools/mkmap.js 가 직접 그린다.
    // 원본이 "Free to share or remix" 라 CC BY-SA 처럼 파생물이 묶이지 않는다 — 출처만 밝히면 된다.
    credit: '통계청', license: '2018 센서스용 행정구역경계',
    sourceUrl: 'https://sgis.kostat.go.kr/',

    // 지명. kind: 'gu' 행정구역 / 'sea' 바다·인접 지역(옅게, 자간 넓게)
    labels: [
      { n: '기장군',   lat: 35.2916, lng: 129.1938 },
      { n: '금정구',   lat: 35.2528, lng: 129.0933 },
      { n: '북구',     lat: 35.2272, lng: 129.0303 },
      { n: '동래구',   lat: 35.2069, lng: 129.0855 },
      { n: '해운대구', lat: 35.1864, lng: 129.1557 },
      { n: '연제구',   lat: 35.1842, lng: 129.0879 },
      { n: '부산진구', lat: 35.1652, lng: 129.0500 },
      { n: '수영구',   lat: 35.1620, lng: 129.1142 },
      { n: '사상구',   lat: 35.1557, lng: 128.9933 },
      { n: '강서구',   lat: 35.1488, lng: 128.9107 },
      { n: '동구',     lat: 35.1301, lng: 129.0515 },
      { n: '남구',     lat: 35.1259, lng: 129.0969 },
      { n: '서구',     lat: 35.1154, lng: 129.0202 },
      { n: '중구',     lat: 35.1047, lng: 129.0366 },
      { n: '사하구',   lat: 35.0944, lng: 128.9865 },
      { n: '영도구',   lat: 35.0834, lng: 129.0643 },
      { n: '경상남도', lat: 35.3060, lng: 128.9107, kind: 'sea' },
      { n: '동해',     lat: 35.2023, lng: 129.2687, kind: 'sea' },
      { n: '대한해협', lat: 35.0602, lng: 129.1906, kind: 'sea' },
      { n: '남해',     lat: 35.0214, lng: 128.9086, kind: 'sea' }
    ]
  },
  // 관광지 세부 타입. 의뢰인 연령대가 선호하는 타입이면 만족도가 오른다.
  sightTypes: {
    activity: { name: '액티비티', ico: 'ferris-wheel' },
    shopping: { name: '쇼핑',     ico: 'shopping-bag' },
    nature:   { name: '자연경관', ico: 'trees' },
    photo:    { name: '포토스팟', ico: 'camera' },
    culture:  { name: '문화',     ico: 'landmark' }   // 전시·미술관·도서관·영화관
  },
  // 요일. 0=월 … 6=일. 여행 d일차의 요일 = (의뢰 startDow + d) % 7
  dayNames: ['월', '화', '수', '목', '금', '토', '일'],
  weekendStay: { days: [4, 5], rate: 1.4 },   // 금·토 체크인은 숙박비 40% 할증

  // 식당 세부 타입. 식사는 체력을 회복시키지만 카페는 회복이 절반이다.
  foodTypes: {
    meal: { name: '식사', ico: 'utensils' },
    cafe: { name: '카페', ico: 'coffee' }
  },
  // 연령대별 선호. 선호하는 세부 타입의 관광지는 만족도 +3.
  ageTypes: {
    '20대':      { likes: ['activity', 'photo'],   desc: '액티비티와 사진 찍기 좋은 곳을 좋아합니다' },
    '30대':      { likes: ['shopping', 'photo'],   desc: '쇼핑과 사진 찍기 좋은 곳을 좋아합니다' },
    '40대':      { likes: ['culture', 'shopping'], desc: '전시·공연 같은 문화시설과 쇼핑을 좋아합니다' },
    '60대 이상': { likes: ['nature', 'culture'],   desc: '자연경관과 차분한 문화시설을 좋아합니다' },
    '아이 동반': { likes: ['activity', 'nature'],  desc: '아이들이 좋아할 체험과 자연을 찾습니다' }
  },

  // 의뢰인 체력 타입. 하루에 쓸 수 있는 체력(stamina)은 의뢰마다 다르고,
  // 관광은 체력을 깎고 식사는 회복시킨다. 잠이 부족하면 다음날 체력 한계가 줄어든다.
  staminaTypes: {
    morning:    { name: '아침형',     ico: 'sunrise', desc: '23시 넘겨 자면 다음날 체력 한계가 크게 준다' },
    night:      { name: '야행성',     ico: 'moon',    desc: '새벽 4~8시 활동은 체력 소모가 1.6배' },
    energizer:  { name: '에너자이저', ico: 'zap',     desc: '모든 체력 소모가 30% 적다' },
    motionsick: { name: '심한 멀미',  ico: 'waves',   desc: '이동할 때 체력 소모가 2배' }
  },

  // 손님이 사는 곳에서 부산까지 오는 교통편.
  //   to     : 도착하는 시작지점 id
  //   cost   : 편도 요금. per:'person' 은 1인당, per:'car' 는 차 1대(4인)당 유류비·통행료
  //   arrive : 부산 도착 시각(분). 1일차는 이 시각부터 시작한다 — 싼 편일수록 늦게 도착.
  //   min    : 소요 시간(분). 타임라인 1일차 맨 앞에 이동 구간으로 그린다.
  // per:'car' 를 고르면 차를 몰고 오므로 여행 중 렌터카 일 대여료가 들지 않는다.
  origins: {
    '서울': [
      { id: 'ktx', drain: 0.06,  name: 'KTX',      ico: 'train-front', to: 'busanstn', cost: 59800, per: 'person', arrive: 545, min: 165 },
      { id: 'air', drain: 0.1,  name: '항공',      ico: 'plane',       to: 'gimhae',   cost: 79000, per: 'person', arrive: 530, min: 110 },
      { id: 'bus', drain: 0.11,  name: '고속버스',   ico: 'bus',         to: 'nopo',     cost: 27000, per: 'person', arrive: 650, min: 260 },
      { id: 'car', drain: 0.16,  name: '자차',      ico: 'car',         to: 'busanstn', cost: 52000, per: 'car',    arrive: 630, min: 300 }
    ],
    '대구': [
      { id: 'ktx', drain: 0.06,  name: 'KTX',      ico: 'train-front', to: 'busanstn', cost: 17100, per: 'person', arrive: 520, min: 50 },
      { id: 'bus', drain: 0.11,  name: '고속버스',   ico: 'bus',         to: 'nopo',     cost: 9500,  per: 'person', arrive: 580, min: 100 },
      { id: 'car', drain: 0.16,  name: '자차',      ico: 'car',         to: 'busanstn', cost: 22000, per: 'car',    arrive: 570, min: 110 }
    ],
    '광주': [
      { id: 'ktx', drain: 0.06,  name: 'KTX',      ico: 'train-front', to: 'busanstn', cost: 40000, per: 'person', arrive: 600, min: 195 },
      { id: 'bus', drain: 0.11,  name: '고속버스',   ico: 'bus',         to: 'nopo',     cost: 26000, per: 'person', arrive: 630, min: 240 },
      { id: 'car', drain: 0.16,  name: '자차',      ico: 'car',         to: 'busanstn', cost: 45000, per: 'car',    arrive: 620, min: 230 }
    ],
    '제주': [
      { id: 'air', drain: 0.1,  name: '항공',      ico: 'plane',       to: 'gimhae',   cost: 62000, per: 'person', arrive: 540, min: 60 },
      { id: 'ship', drain: 0.09, name: '여객선',    ico: 'ship',        to: 'port',     cost: 38000, per: 'person', arrive: 480, min: 690 }
    ]
  },

  // 여행 시작지점. 도착 교통편이 어디로 오는지에 따라 결정된다.
  starts: [
    { id: 'busanstn', name: '부산역', lat: 35.1151, lng: 129.0413, note: 'KTX' },
    { id: 'gimhae', name: '김해국제공항', lat: 35.1795, lng: 128.9382, note: '항공' },
    { id: 'nopo', name: '노포동 종합버스터미널', lat: 35.2884, lng: 129.0913, note: '고속버스' },
    { id: 'port', name: '부산항 국제여객터미널', lat: 35.1177, lng: 129.0452, note: '여객선' }
  ],

  pois: [
    // ── 관광지 ──────────────────────────────────────────
    { id: 'haeundae', gu: '해운대구', name: '해운대해수욕장', type: 'sight', sub: 'nature', lat: 35.1587, lng: 129.1604, cost: 0, stay: 90, joy: 7, open: [0, 1440] },
    { id: 'gwangalli', gu: '수영구', name: '광안리해수욕장', type: 'sight', sub: 'photo', lat: 35.1532, lng: 129.1187, cost: 0, stay: 90, joy: 7, open: [0, 1440] },
    // access: 대중교통 정류장·역에서 문 앞까지의 추가 도보(분). 언덕 위라 유별나게 멀다.
    // 실측(네이버 길찾기) 부산역→감천: 버스 46분 / 지하철 37분(승차 7 + 도보 30). access 21 로 44·38.
    { id: 'gamcheon', gu: '사하구', name: '감천문화마을', type: 'sight', sub: 'photo', access: 21, lat: 35.0975, lng: 129.0107, cost: 2000, stay: 120, joy: 9, open: [540, 1080] },
    { id: 'jagalchi', gu: '중구', name: '자갈치시장', type: 'sight', sub: 'shopping', lat: 35.0967, lng: 129.0304, cost: 0, stay: 60, joy: 7, open: [300, 1320] },
    { id: 'gukje', closed: [6], gu: '중구', name: '국제시장', type: 'sight', sub: 'shopping', lat: 35.1017, lng: 129.0263, cost: 0, stay: 60, joy: 6, open: [540, 1320] },
    { id: 'biff', gu: '중구', name: 'BIFF광장', type: 'sight', sub: 'culture', lat: 35.0985, lng: 129.0281, cost: 0, stay: 40, joy: 5, open: [600, 1320] },
    { id: 'yongdusan', gu: '중구', name: '용두산공원·부산타워', type: 'sight', sub: 'photo', lat: 35.1006, lng: 129.0324, cost: 12000, stay: 60, joy: 6, open: [600, 1380] },
    { id: 'taejongdae', gu: '영도구', name: '태종대', type: 'sight', sub: 'nature', lat: 35.0517, lng: 129.0870, cost: 4000, stay: 120, joy: 8, open: [540, 1080] },
    { id: 'yongkungsa', gu: '기장군', name: '해동용궁사', type: 'sight', sub: 'photo', lat: 35.1884, lng: 129.2233, cost: 0, stay: 90, joy: 9, open: [270, 1140] },
    { id: 'huinyeoul', gu: '영도구', name: '흰여울문화마을', type: 'sight', sub: 'photo', lat: 35.0768, lng: 129.0455, cost: 0, stay: 70, joy: 8, open: [0, 1440] },
    { id: 'songdo', gu: '서구', name: '송도해상케이블카', type: 'sight', sub: 'activity', lat: 35.0757, lng: 129.0172, cost: 17000, stay: 60, joy: 8, open: [540, 1200] },
    { id: 'centum', gu: '해운대구', name: '신세계 센텀시티', type: 'sight', sub: 'shopping', lat: 35.1690, lng: 129.1300, cost: 0, stay: 90, joy: 6, open: [630, 1230] },
    { id: 'oryukdo', gu: '남구', name: '오륙도 스카이워크', type: 'sight', sub: 'activity', lat: 35.0967, lng: 129.1236, cost: 0, stay: 60, joy: 7, open: [540, 1080] },
    { id: 'igidae', gu: '남구', name: '이기대 해안산책로', type: 'sight', sub: 'nature', lat: 35.1272, lng: 129.1218, cost: 0, stay: 100, joy: 8, open: [0, 1440] },
    { id: 'xthesky', gu: '해운대구', name: '부산엑스더스카이', type: 'sight', sub: 'photo', lat: 35.1595, lng: 129.1697, cost: 27000, stay: 60, joy: 8, open: [600, 1380] },
    { id: 'dadaepo', gu: '사하구', name: '다대포 낙조분수', type: 'sight', sub: 'nature', lat: 35.0463, lng: 128.9663, cost: 0, stay: 90, joy: 8, open: [0, 1440] },
    { id: 'songjeong', gu: '해운대구', name: '송정해수욕장', type: 'sight', sub: 'nature', lat: 35.1786, lng: 129.1993, cost: 0, stay: 80, joy: 7, open: [0, 1440] },
    { id: 'hwangnyeong', gu: '남구', name: '황령산 봉수대 야경', type: 'sight', sub: 'photo', lat: 35.1420, lng: 129.0790, cost: 0, stay: 60, joy: 9, open: [0, 1440] },
    { id: 'beomeosa', gu: '금정구', name: '범어사', type: 'sight', sub: 'nature', lat: 35.2856, lng: 129.0689, cost: 0, stay: 90, joy: 8, open: [480, 1140] },
    { id: 'lotteworld', gu: '기장군', name: '롯데월드 어드벤처 부산', type: 'sight', sub: 'activity', lat: 35.1953, lng: 129.2130, cost: 47000, stay: 300, joy: 9, open: [600, 1200] },
    { id: 'aquarium', gu: '해운대구', name: '씨라이프 아쿠아리움', type: 'sight', sub: 'activity', lat: 35.1590, lng: 129.1602, cost: 32000, stay: 90, joy: 7, open: [600, 1200] },
    { id: 'chungsapo', gu: '해운대구', name: '청사포 다릿돌전망대', type: 'sight', sub: 'photo', lat: 35.1622, lng: 129.1917, cost: 0, stay: 50, joy: 8, open: [540, 1080] },
    { id: 'mocabusan', closed: [0], gu: '사하구', name: '부산현대미술관', type: 'sight', sub: 'culture', lat: 35.1084, lng: 128.9457, cost: 0, stay: 80, joy: 7, open: [600, 1080] },
    { id: 'ibagu', gu: '동구', name: '초량이바구길', type: 'sight', sub: 'photo', lat: 35.1152, lng: 129.0374, cost: 0, stay: 70, joy: 8, open: [540, 1080] },

    // 문화시설 — 전시·미술관·도서관·영화관
    { id: 'cinecenter', gu: '해운대구', name: '영화의전당', type: 'sight', sub: 'culture', lat: 35.1712, lng: 129.1290, cost: 9000, stay: 120, joy: 8, open: [600, 1380] },
    { id: 'moak', closed: [0], gu: '해운대구', name: '부산시립미술관', type: 'sight', sub: 'culture', lat: 35.1697, lng: 129.1305, cost: 0, stay: 90, joy: 7, open: [600, 1080] },
    { id: 'f1963', gu: '수영구', name: 'F1963 복합문화공간', type: 'sight', sub: 'culture', lat: 35.1585, lng: 129.0975, cost: 0, stay: 80, joy: 7, open: [540, 1260] },
    { id: 'history', closed: [0], gu: '중구', name: '부산근현대역사관', type: 'sight', sub: 'culture', lat: 35.1010, lng: 129.0335, cost: 0, stay: 70, joy: 7, open: [600, 1080] },
    { id: 'library', closed: [0], gu: '사상구', name: '부산도서관', type: 'sight', sub: 'culture', lat: 35.1690, lng: 128.9880, cost: 0, stay: 60, joy: 6, open: [540, 1200] },
    { id: 'millaksu', gu: '수영구', name: '민락수변공원', type: 'sight', sub: 'photo', lat: 35.1540, lng: 129.1285, cost: 0, stay: 70, joy: 8, open: [0, 1440] },
    { id: 'daejeo', gu: '강서구', name: '대저생태공원', type: 'sight', sub: 'nature', lat: 35.1830, lng: 128.9670, cost: 0, stay: 90, joy: 7, open: [0, 1440] },
    { id: 'skycapsule', gu: '해운대구', name: '청사포 스카이캡슐', type: 'sight', sub: 'activity', lat: 35.1573, lng: 129.1917, cost: 22000, stay: 60, joy: 9, open: [570, 1200] },

    // ── 식당 ────────────────────────────────────────────
    { id: 'dwaeji', gu: '중구', name: '쌍둥이돼지국밥', type: 'food', sub: 'meal', lat: 35.0968, lng: 129.0305, cost: 10000, stay: 50, joy: 7, open: [480, 1320] },
    { id: 'milmyeon', closed: [1], gu: '부산진구', name: '개금밀면', type: 'food', sub: 'meal', lat: 35.1479, lng: 129.0231, cost: 9000, stay: 40, joy: 7, open: [630, 1200] },
    { id: 'hotteok', gu: '중구', name: 'BIFF 씨앗호떡', type: 'food', sub: 'meal', lat: 35.0985, lng: 129.0281, cost: 2000, stay: 20, joy: 6, open: [660, 1320] },
    { id: 'eomuk', gu: '영도구', name: '삼진어묵 영도본점', type: 'food', sub: 'meal', lat: 35.0912, lng: 129.0417, cost: 6000, stay: 30, joy: 6, open: [540, 1200] },
    { id: 'hoe', gu: '중구', name: '자갈치 회센터', type: 'food', sub: 'meal', lat: 35.0965, lng: 129.0303, cost: 35000, stay: 80, joy: 9, open: [600, 1320] },
    { id: 'galbi', gu: '해운대구', name: '해운대 암소갈비집', type: 'food', sub: 'meal', lat: 35.1631, lng: 129.1631, cost: 45000, stay: 90, joy: 9, open: [660, 1320] },
    { id: 'jogae', gu: '수영구', name: '광안리 조개구이', type: 'food', sub: 'meal', lat: 35.1540, lng: 129.1180, cost: 30000, stay: 90, joy: 8, open: [1020, 1440] },
    { id: 'cafe', gu: '해운대구', name: '청사포 오션뷰 카페', type: 'food', sub: 'cafe', lat: 35.1610, lng: 129.1930, cost: 9000, stay: 60, joy: 7, open: [600, 1260] },
    { id: 'yasijang', gu: '중구', name: '부평깡통 야시장', type: 'food', sub: 'meal', lat: 35.1005, lng: 129.0270, cost: 12000, stay: 50, joy: 7, open: [1140, 1440] },
    { id: 'myeolchi', gu: '기장군', name: '대변항 멸치회', type: 'food', sub: 'meal', lat: 35.2050, lng: 129.2230, cost: 25000, stay: 70, joy: 8, open: [660, 1200] },
    // 식당이 원도심에만 몰려 있어 구마다 하나씩 그 동네 음식으로 채움
    { id: 'jobang', closed: [6], gu: '동구', name: '조방낙지 (범일동)', type: 'food', sub: 'meal', lat: 35.1365, lng: 129.0570, cost: 13000, stay: 60, joy: 7, open: [660, 1320] },
    { id: 'jaecheop', gu: '남구', name: '대연동 재첩국', type: 'food', sub: 'meal', lat: 35.1352, lng: 129.0940, cost: 9000, stay: 40, joy: 7, open: [420, 1140] },
    { id: 'dongnaepajeon', closed: [0], gu: '동래구', name: '동래할매파전', type: 'food', sub: 'meal', lat: 35.2045, lng: 129.0846, cost: 22000, stay: 60, joy: 8, open: [660, 1260] },
    { id: 'haenyeo', gu: '서구', name: '송도 해녀촌 해산물', type: 'food', sub: 'meal', lat: 35.0755, lng: 129.0180, cost: 28000, stay: 70, joy: 8, open: [600, 1260] },
    { id: 'gopchang', closed: [6], gu: '연제구', name: '연산동 곱창골목', type: 'food', sub: 'meal', lat: 35.1840, lng: 129.0805, cost: 18000, stay: 70, joy: 8, open: [1020, 1440] },
    { id: 'gupo', gu: '북구', name: '구포국수', type: 'food', sub: 'meal', lat: 35.2113, lng: 128.9996, cost: 7000, stay: 35, joy: 6, open: [600, 1200] },
    { id: 'dadaejogae', gu: '사하구', name: '다대포 조개구이', type: 'food', sub: 'meal', lat: 35.0492, lng: 128.9675, cost: 26000, stay: 80, joy: 8, open: [1020, 1440] },
    { id: 'sanseong', closed: [1], gu: '금정구', name: '금정산성 막걸리·염소불고기', type: 'food', sub: 'meal', lat: 35.2530, lng: 129.0490, cost: 20000, stay: 70, joy: 8, open: [660, 1260] },
    { id: 'samrak', gu: '사상구', name: '삼락 오리불고기', type: 'food', sub: 'meal', lat: 35.1720, lng: 128.9720, cost: 24000, stay: 80, joy: 7, open: [660, 1260] },
    { id: 'myeongji', gu: '강서구', name: '명지 대파삼겹살', type: 'food', sub: 'meal', lat: 35.0955, lng: 128.9105, cost: 19000, stay: 75, joy: 8, open: [960, 1380] },


    // 지역별 대표 식사 (2차 추가)
    { id: 'wandang', gu: '중구', name: '18번완당집', type: 'food', sub: 'meal', lat: 35.0992, lng: 129.0275, cost: 9000, stay: 40, joy: 7, open: [630, 1260] },
    { id: 'hdmilmyeon', gu: '해운대구', name: '해운대 밀면', type: 'food', sub: 'meal', lat: 35.1625, lng: 129.1608, cost: 9500, stay: 40, joy: 7, open: [630, 1230] },
    { id: 'millak', gu: '수영구', name: '민락동 회타운', type: 'food', sub: 'meal', closed: [1], lat: 35.1520, lng: 129.1235, cost: 38000, stay: 90, joy: 9, open: [660, 1380] },
    { id: 'seomyeongalbi', gu: '부산진구', name: '서면 돼지갈비골목', type: 'food', sub: 'meal', lat: 35.1560, lng: 129.0598, cost: 20000, stay: 80, joy: 8, open: [660, 1380] },
    { id: 'ksgopchang', gu: '남구', name: '경성대 곱창', type: 'food', sub: 'meal', lat: 35.1372, lng: 129.0995, cost: 17000, stay: 70, joy: 7, open: [1020, 1440] },
    { id: 'myeongnyun', gu: '동래구', name: '명륜동 떡볶이', type: 'food', sub: 'meal', closed: [0], lat: 35.2100, lng: 129.0790, cost: 6000, stay: 30, joy: 6, open: [660, 1260] },
    { id: 'gomjangeo', gu: '기장군', name: '기장 곰장어', type: 'food', sub: 'meal', lat: 35.2440, lng: 129.2220, cost: 24000, stay: 80, joy: 8, open: [660, 1320] },
    { id: 'sanchae', gu: '금정구', name: '범어사 산채정식', type: 'food', sub: 'meal', lat: 35.2840, lng: 129.0700, cost: 15000, stay: 60, joy: 7, open: [600, 1140] },
    { id: 'bongnae', gu: '영도구', name: '봉래동 밀면', type: 'food', sub: 'meal', lat: 35.0930, lng: 129.0430, cost: 8500, stay: 40, joy: 7, open: [630, 1200] },
    { id: 'hwamyeong', gu: '북구', name: '화명동 갈매기살', type: 'food', sub: 'meal', lat: 35.2320, lng: 129.0110, cost: 16000, stay: 70, joy: 7, open: [1020, 1380] },
    { id: 'eosijang', gu: '서구', name: '부산공동어시장 회', type: 'food', sub: 'meal', lat: 35.0900, lng: 129.0180, cost: 30000, stay: 80, joy: 8, open: [420, 1200] },
    { id: 'deokpo', gu: '사상구', name: '덕포시장 순대국', type: 'food', sub: 'meal', lat: 35.1600, lng: 128.9790, cost: 9000, stay: 45, joy: 6, open: [420, 1260] },
    { id: 'myeongjiori', gu: '강서구', name: '명지 오리구이', type: 'food', sub: 'meal', lat: 35.0980, lng: 128.9130, cost: 22000, stay: 80, joy: 7, open: [660, 1320] },
    { id: 'gamchennoodle', gu: '사하구', name: '감천 손칼국수', type: 'food', sub: 'meal', lat: 35.0968, lng: 129.0115, cost: 8000, stay: 40, joy: 6, open: [630, 1200] },
    { id: 'choryang', gu: '동구', name: '초량 밀면', type: 'food', sub: 'meal', lat: 35.1155, lng: 129.0400, cost: 9000, stay: 40, joy: 7, open: [630, 1200] },
    { id: 'yeonsannakji', gu: '연제구', name: '연산동 낙지볶음', type: 'food', sub: 'meal', lat: 35.1830, lng: 129.0790, cost: 16000, stay: 60, joy: 7, open: [660, 1320] },

    // 카페
    { id: 'jeonpo', gu: '부산진구', name: '전포 카페거리', type: 'food', sub: 'cafe', lat: 35.1545, lng: 129.0645, cost: 8000, stay: 50, joy: 7, open: [660, 1320] },
    { id: 'huincafe', gu: '영도구', name: '흰여울 오션뷰 카페', type: 'food', sub: 'cafe', lat: 35.0772, lng: 129.0448, cost: 9000, stay: 60, joy: 8, open: [600, 1260] },
    { id: 'dadaecafe', gu: '사하구', name: '다대포 선셋 카페', type: 'food', sub: 'cafe', lat: 35.0478, lng: 128.9672, cost: 7500, stay: 50, joy: 7, open: [660, 1380] },

    { id: 'waveon', gu: '기장군', name: '웨이브온 커피', type: 'food', sub: 'cafe', lat: 35.2560, lng: 129.2260, cost: 9000, stay: 70, joy: 9, open: [600, 1320] },
    { id: 'dalmaji', gu: '해운대구', name: '달맞이고개 카페', type: 'food', sub: 'cafe', lat: 35.1560, lng: 129.1780, cost: 9500, stay: 60, joy: 8, open: [600, 1320] },
    { id: 'beacon', gu: '수영구', name: '비콘그라운드', type: 'food', sub: 'cafe', lat: 35.1690, lng: 129.1050, cost: 7500, stay: 50, joy: 7, open: [660, 1260] },
    { id: 'bookcafe', gu: '중구', name: '백년어서원 북카페', type: 'food', sub: 'cafe', lat: 35.1000, lng: 129.0330, cost: 6500, stay: 60, joy: 7, open: [600, 1200] },
    { id: 'igidaecafe', gu: '남구', name: '이기대 오션뷰 카페', type: 'food', sub: 'cafe', lat: 35.1268, lng: 129.1230, cost: 9000, stay: 55, joy: 8, open: [600, 1260] },
    { id: 'teahouse', gu: '금정구', name: '범어사 앞 전통찻집', type: 'food', sub: 'cafe', lat: 35.2830, lng: 129.0690, cost: 8000, stay: 50, joy: 7, open: [540, 1140] },
    { id: 'gupocafe', gu: '북구', name: '구포 강변 카페', type: 'food', sub: 'cafe', lat: 35.2100, lng: 128.9990, cost: 7000, stay: 50, joy: 6, open: [630, 1260] },

    // 3차 추가 — 원도심 밖 12개 구에 2곳씩
    { id: 'hdgukbap', gu: '해운대구', name: '해운대 원조할매국밥', type: 'food', sub: 'meal', lat: 35.1620, lng: 129.1590, cost: 11000, stay: 50, joy: 7, open: [420, 1320] },
    { id: 'surfcafe', gu: '해운대구', name: '송정 서핑 카페', type: 'food', sub: 'cafe', lat: 35.1785, lng: 129.1995, cost: 8500, stay: 55, joy: 8, open: [600, 1260] },
    { id: 'mangmi', gu: '수영구', name: '망미단길 스시', type: 'food', sub: 'meal', closed: [0], lat: 35.1700, lng: 129.1080, cost: 32000, stay: 80, joy: 8, open: [690, 1320] },
    { id: 'paldo', gu: '수영구', name: '수영팔도시장 통닭', type: 'food', sub: 'meal', lat: 35.1650, lng: 129.1130, cost: 14000, stay: 50, joy: 7, open: [660, 1320] },
    { id: 'yongho', gu: '남구', name: '용호동 낙지', type: 'food', sub: 'meal', lat: 35.1200, lng: 129.1150, cost: 15000, stay: 60, joy: 8, open: [660, 1320] },
    { id: 'bokguk', gu: '남구', name: '대연동 복국', type: 'food', sub: 'meal', lat: 35.1350, lng: 129.0900, cost: 18000, stay: 55, joy: 7, open: [420, 1260] },
    { id: 'nakgopsae', gu: '부산진구', name: '서면 낙곱새', type: 'food', sub: 'meal', lat: 35.1570, lng: 129.0590, cost: 15000, stay: 60, joy: 8, open: [660, 1380] },
    { id: 'bujeon', gu: '부산진구', name: '부전시장 팥빙수', type: 'food', sub: 'cafe', lat: 35.1620, lng: 129.0570, cost: 7000, stay: 40, joy: 7, open: [600, 1200] },
    { id: 'dongnaebok', gu: '동래구', name: '동래 복국', type: 'food', sub: 'meal', lat: 35.2030, lng: 129.0850, cost: 19000, stay: 60, joy: 7, open: [420, 1260] },
    { id: 'oncheoncafe', gu: '동래구', name: '온천장 한옥카페', type: 'food', sub: 'cafe', lat: 35.2200, lng: 129.0830, cost: 8000, stay: 55, joy: 7, open: [630, 1260] },
    { id: 'mulkkong', gu: '연제구', name: '연산동 물꽁탕', type: 'food', sub: 'meal', lat: 35.1800, lng: 129.0800, cost: 17000, stay: 60, joy: 7, open: [600, 1260] },
    { id: 'togok', gu: '연제구', name: '토곡 순대국', type: 'food', sub: 'meal', lat: 35.1880, lng: 129.0900, cost: 9500, stay: 45, joy: 6, open: [420, 1320] },
    { id: 'pnutteok', gu: '금정구', name: '부산대 앞 떡볶이', type: 'food', sub: 'meal', lat: 35.2320, lng: 129.0840, cost: 6500, stay: 30, joy: 6, open: [660, 1380] },
    { id: 'pnucafe', gu: '금정구', name: '부산대 앞 로스터리', type: 'food', sub: 'cafe', lat: 35.2310, lng: 129.0855, cost: 6500, stay: 50, joy: 7, open: [600, 1320] },
    { id: 'deokcheon', gu: '북구', name: '덕천동 돼지국밥', type: 'food', sub: 'meal', lat: 35.2170, lng: 129.0100, cost: 10000, stay: 45, joy: 7, open: [420, 1380] },
    { id: 'gupopat', gu: '북구', name: '구포시장 팥죽', type: 'food', sub: 'cafe', lat: 35.2110, lng: 129.0000, cost: 6000, stay: 35, joy: 6, open: [540, 1140] },
    { id: 'sasangori', gu: '사상구', name: '사상 오리주물럭', type: 'food', sub: 'meal', lat: 35.1620, lng: 128.9820, cost: 21000, stay: 75, joy: 7, open: [660, 1320] },
    { id: 'samrakcafe', gu: '사상구', name: '삼락공원 강변 카페', type: 'food', sub: 'cafe', lat: 35.1740, lng: 128.9700, cost: 7000, stay: 50, joy: 7, open: [600, 1260] },
    { id: 'gadeok', gu: '강서구', name: '가덕도 대구탕', type: 'food', sub: 'meal', lat: 35.0350, lng: 128.8400, cost: 20000, stay: 70, joy: 8, open: [420, 1140] },
    { id: 'minari', gu: '강서구', name: '강서 미나리 삼겹살', type: 'food', sub: 'meal', lat: 35.1750, lng: 128.9350, cost: 19000, stay: 75, joy: 7, open: [660, 1320] },
    { id: 'hadanori', gu: '사하구', name: '하단 오리불고기', type: 'food', sub: 'meal', lat: 35.1060, lng: 128.9660, cost: 20000, stay: 75, joy: 7, open: [660, 1320] },
    { id: 'hadancafe', gu: '사하구', name: '하단 강변 카페', type: 'food', sub: 'cafe', lat: 35.1030, lng: 128.9640, cost: 7500, stay: 50, joy: 7, open: [630, 1260] },
    { id: 'ilgwang', gu: '기장군', name: '일광해수욕장 조개구이', type: 'food', sub: 'meal', lat: 35.2610, lng: 129.2350, cost: 27000, stay: 85, joy: 8, open: [1020, 1440] },
    { id: 'jeonggwan', gu: '기장군', name: '정관 순두부', type: 'food', sub: 'meal', closed: [1], lat: 35.3200, lng: 129.1800, cost: 11000, stay: 50, joy: 6, open: [600, 1260] },
    { id: 'subyeon', gu: '수영구', name: '수변최고국밥', type: 'food', sub: 'meal', lat: 35.1527, lng: 129.1252, cost: 11000, stay: 50, joy: 8, open: [0, 1440] },
    { id: 'ijaemo', gu: '중구', name: '이재모피자', type: 'food', sub: 'meal', lat: 35.1010, lng: 129.0247, cost: 22000, stay: 60, joy: 8, open: [660, 1290] },
    { id: 'chilamsagye', gu: '기장군', name: '칠암사계', type: 'food', sub: 'cafe', lat: 35.2760, lng: 129.2530, cost: 12000, stay: 70, joy: 8, open: [600, 1290] },
    // 영도구 동삼로28번길 6 (동삼동, 한국해양대 방면). 좌표는 도로명 주소를 지도에 맞춘 근사값.
    { id: 'baekseol', gu: '영도구', name: '백설대학', type: 'food', sub: 'meal', lat: 35.0797, lng: 129.0812, cost: 15000, stay: 60, joy: 8, open: [660, 1380] },

    // ── 숙소 (cost = 1박 2인실 기준, stay=0: 취침하면 그날 종료) ──
    { id: 'gh_nampo', gu: '중구', name: '남포동 게스트하우스', type: 'stay', tier: 'guesthouse', lat: 35.0993, lng: 129.0290, cost: 25000, stay: 0, joy: 4, open: [900, 1440] },
    { id: 'gh_haeundae', gu: '해운대구', name: '해운대 게스트하우스', type: 'stay', tier: 'guesthouse', lat: 35.1602, lng: 129.1620, cost: 30000, stay: 0, joy: 4, open: [900, 1440] },
    { id: 'motel_seomyeon', gu: '부산진구', name: '서면 모텔', type: 'stay', tier: 'motel', lat: 35.1580, lng: 129.0590, cost: 55000, stay: 0, joy: 5, open: [900, 1440] },
    { id: 'gh_yeongdo', gu: '영도구', name: '영도 흰여울 게스트하우스', type: 'stay', tier: 'guesthouse', lat: 35.0770, lng: 129.0450, cost: 28000, stay: 0, joy: 5, open: [900, 1440] },
    { id: 'res_haeundae', gu: '해운대구', name: '해운대 레지던스', type: 'stay', tier: 'motel', lat: 35.1620, lng: 129.1580, cost: 80000, stay: 0, joy: 6, open: [900, 1440] },
    { id: 'hotel_gwangalli', gu: '수영구', name: '광안리 오션뷰 호텔', type: 'stay', tier: 'hotel', star: 4, lat: 35.1525, lng: 129.1180, cost: 150000, stay: 0, joy: 8, open: [900, 1440] },
    { id: 'hotel_seomyeon', gu: '부산진구', name: '서면 비즈니스 호텔', type: 'stay', tier: 'hotel', star: 4, lat: 35.1565, lng: 129.0555, cost: 105000, stay: 0, joy: 7, open: [900, 1440] },
    { id: 'hotel_songdo', gu: '서구', name: '송도 비치 호텔', type: 'stay', tier: 'hotel', star: 4, lat: 35.0760, lng: 129.0190, cost: 110000, stay: 0, joy: 7, open: [900, 1440] },
    { id: 'hotel_paradise', gu: '해운대구', name: '파라다이스 호텔 부산', type: 'stay', tier: 'hotel', star: 5, lat: 35.1591, lng: 129.1634, cost: 320000, stay: 0, joy: 10, open: [900, 1440] },
    // 5성급
    { id: 'signiel', gu: '해운대구', name: '시그니엘 부산', type: 'stay', tier: 'hotel', star: 5, lat: 35.1596, lng: 129.1685, cost: 450000, stay: 0, joy: 10, open: [900, 1440] },
    { id: 'parkhyatt', gu: '해운대구', name: '파크 하얏트 부산', type: 'stay', tier: 'hotel', star: 5, lat: 35.1550, lng: 129.1430, cost: 400000, stay: 0, joy: 10, open: [900, 1440] },
    { id: 'westin', gu: '해운대구', name: '웨스틴 조선 부산', type: 'stay', tier: 'hotel', star: 5, lat: 35.1543, lng: 129.1546, cost: 380000, stay: 0, joy: 10, open: [900, 1440] },
    { id: 'grandjosun', gu: '해운대구', name: '그랜드 조선 부산', type: 'stay', tier: 'hotel', star: 5, lat: 35.1585, lng: 129.1615, cost: 350000, stay: 0, joy: 9, open: [900, 1440] },
    { id: 'ananti', gu: '기장군', name: '아난티 힐튼 부산', type: 'stay', tier: 'hotel', star: 5, lat: 35.2005, lng: 129.2245, cost: 420000, stay: 0, joy: 10, open: [900, 1440] },
    { id: 'lotte', gu: '부산진구', name: '롯데호텔 부산', type: 'stay', tier: 'hotel', star: 5, lat: 35.1568, lng: 129.0555, cost: 280000, stay: 0, joy: 9, open: [900, 1440] },
    { id: 'avani', gu: '해운대구', name: '아바니 센트럴 부산', type: 'stay', tier: 'hotel', star: 5, lat: 35.1700, lng: 129.1290, cost: 260000, stay: 0, joy: 9, open: [900, 1440] },

    // 4성급
    { id: 'novotel', gu: '해운대구', name: '노보텔 앰배서더 부산', type: 'stay', tier: 'hotel', star: 4, lat: 35.1585, lng: 129.1600, cost: 220000, stay: 0, joy: 8, open: [900, 1440] },
    { id: 'ibis', gu: '해운대구', name: '이비스 앰배서더 해운대', type: 'stay', tier: 'hotel', star: 4, lat: 35.1610, lng: 129.1630, cost: 150000, stay: 0, joy: 7, open: [900, 1440] },
    { id: 'commodore', gu: '중구', name: '코모도 호텔 부산', type: 'stay', tier: 'hotel', star: 4, lat: 35.1090, lng: 129.0330, cost: 140000, stay: 0, joy: 7, open: [900, 1440] },
    { id: 'astihotel', gu: '동구', name: '아스티 호텔 부산역', type: 'stay', tier: 'hotel', star: 4, lat: 35.1150, lng: 129.0420, cost: 160000, stay: 0, joy: 8, open: [900, 1440] },
    { id: 'nongshim', gu: '동래구', name: '호텔 농심 (허심청)', type: 'stay', tier: 'hotel', star: 4, lat: 35.2185, lng: 129.0805, cost: 200000, stay: 0, joy: 9, open: [900, 1440] },
    { id: 'crownharbor', gu: '중구', name: '크라운하버 호텔', type: 'stay', tier: 'hotel', star: 4, lat: 35.1055, lng: 129.0390, cost: 130000, stay: 0, joy: 7, open: [900, 1440] },
    { id: 'lavalse', gu: '서구', name: '라발스 호텔', type: 'stay', tier: 'hotel', star: 4, lat: 35.0770, lng: 129.0200, cost: 150000, stay: 0, joy: 8, open: [900, 1440] },

    // 모텔·레지던스
    { id: 'res_gwangalli', gu: '수영구', name: '광안리 레지던스', type: 'stay', tier: 'motel', lat: 35.1520, lng: 129.1180, cost: 85000, stay: 0, joy: 6, open: [900, 1440] },
    { id: 'motel_sasang', gu: '사상구', name: '사상터미널 모텔', type: 'stay', tier: 'motel', lat: 35.1620, lng: 128.9790, cost: 50000, stay: 0, joy: 5, open: [900, 1440] },
    { id: 'motel_dongnae', gu: '동래구', name: '동래온천 모텔', type: 'stay', tier: 'motel', lat: 35.2170, lng: 129.0820, cost: 55000, stay: 0, joy: 5, open: [900, 1440] },
    { id: 'pension_gijang', gu: '기장군', name: '기장 오션뷰 펜션', type: 'stay', tier: 'motel', lat: 35.2450, lng: 129.2230, cost: 90000, stay: 0, joy: 7, open: [900, 1440] },

    // 게스트하우스
    { id: 'gh_choryang', gu: '동구', name: '초량 게스트하우스', type: 'stay', tier: 'guesthouse', lat: 35.1150, lng: 129.0390, cost: 26000, stay: 0, joy: 4, open: [900, 1440] },
    { id: 'gh_gwangalli', gu: '수영구', name: '광안리 게스트하우스', type: 'stay', tier: 'guesthouse', lat: 35.1535, lng: 129.1190, cost: 29000, stay: 0, joy: 5, open: [900, 1440] },
    { id: 'gh_seomyeon', gu: '부산진구', name: '서면 게스트하우스', type: 'stay', tier: 'guesthouse', lat: 35.1560, lng: 129.0580, cost: 27000, stay: 0, joy: 4, open: [900, 1440] },
  ],

  // 이어서 붙이면 손님이 특히 좋아하는 조합. 직전 일정과 방금 넣은 일정이 짝이면 성립하고,
  // 순서는 가리지 않는다(a→b, b→a 모두). joy 는 그 자리에서 만족도에 더해진다.
  // 근접 보상이 되면 점수식의 -이동분과 중복이라 아무 결정도 못 만든다 —
  // 그래서 "같은 동네"가 아니라 실제로 이어 도는 코스만 넣었고, 일부는 거리를 감수하게 뒀다.
  pairs: [
    // 원도심 — 시장에서 시장으로, 구경하고 바로 먹는 코스
    { a: 'jagalchi', b: 'hoe', joy: 8, say: '자갈치 구경하고 바로 회라니, 제대로네요!' },
    { a: 'jagalchi', b: 'gukje', joy: 7, say: '자갈치에서 국제시장까지, 원도심 시장 한 바퀴네요' },
    { a: 'gukje', b: 'hotteok', joy: 7, say: '국제시장 돌고 씨앗호떡, 이건 못 참죠' },
    { a: 'biff', b: 'yasijang', joy: 7, say: 'BIFF광장에서 야시장까지 밤이 길겠어요' },
    { a: 'yongdusan', b: 'history', joy: 6, say: '용두산 내려와서 역사관까지, 차분하고 좋아요' },
    // 영도 — 흰여울과 태종대
    { a: 'huinyeoul', b: 'huincafe', joy: 8, say: '흰여울 걷고 바다 보며 커피, 딱 좋아요' },
    { a: 'taejongdae', b: 'eomuk', joy: 7, say: '태종대 보고 어묵 사가는 게 영도 정석이죠' },
    { a: 'gamcheon', b: 'huinyeoul', joy: 9, say: '감천에서 흰여울까지! 벽화마을 두 곳을 다 보네요' },
    // 사하 — 감천과 다대포 낙조
    { a: 'gamcheon', b: 'gamchennoodle', joy: 6, say: '감천 다 돌고 칼국수 한 그릇, 든든하겠어요' },
    { a: 'dadaepo', b: 'dadaecafe', joy: 8, say: '낙조분수 보고 선셋 카페까지, 해 지는 걸 다 보겠네요' },
    { a: 'dadaepo', b: 'dadaejogae', joy: 8, say: '다대포 노을에 조개구이라니 낭만적이에요' },
    // 서구·남구 — 해안 산책길
    { a: 'songdo', b: 'haenyeo', joy: 8, say: '케이블카 타고 내려와 해녀촌 해산물, 좋은 순서예요' },
    { a: 'oryukdo', b: 'igidae', joy: 8, say: '오륙도에서 이기대로 이어 걷는군요, 갈맷길 그대로네요' },
    { a: 'igidae', b: 'igidaecafe', joy: 8, say: '이기대 걷고 바다 보이는 카페에서 쉬는 거군요' },
    { a: 'hwangnyeong', b: 'ksgopchang', joy: 7, say: '야경 보고 내려와 곱창이라니, 밤이 좋겠어요' },
    // 광안리·민락
    { a: 'gwangalli', b: 'jogae', joy: 8, say: '광안대교 보면서 조개구이, 이게 부산이죠' },
    { a: 'gwangalli', b: 'millaksu', joy: 7, say: '광안리에서 수변공원까지 이어 걷는군요' },
    { a: 'millaksu', b: 'millak', joy: 9, say: '수변공원 보고 회타운이라니, 아는 사람 코스네요!' },
    { a: 'f1963', b: 'mangmi', joy: 8, say: 'F1963 보고 망미단길까지, 요즘 제일 좋아하는 동네예요' },
    // 해운대·청사포·송정
    { a: 'haeundae', b: 'galbi', joy: 9, say: '해운대 보고 암소갈비집이라니 제대로 아시네요!' },
    { a: 'haeundae', b: 'dalmaji', joy: 8, say: '해수욕장에서 달맞이고개로, 노을이 예쁘겠어요' },
    { a: 'xthesky', b: 'haeundae', joy: 7, say: '위에서 내려다보고 아래로 내려가는군요' },
    { a: 'chungsapo', b: 'skycapsule', joy: 9, say: '전망대 보고 스카이캡슐까지! 청사포를 제대로 보네요' },
    { a: 'songjeong', b: 'surfcafe', joy: 8, say: '송정 바다 보고 서핑 카페라니 시원하겠어요' },
    { a: 'moak', b: 'cinecenter', joy: 7, say: '미술관에서 영화의전당까지, 하루가 문화로 꽉 찼네요' },
    // 기장 — 오시리아
    { a: 'yongkungsa', b: 'lotteworld', joy: 8, say: '용궁사 보고 롯데월드까지, 오시리아를 다 도네요' },
    { a: 'yongkungsa', b: 'myeolchi', joy: 8, say: '용궁사 다녀와서 대변항 멸치회, 좋은 조합이에요' },
    // 금정 — 범어사
    { a: 'beomeosa', b: 'sanchae', joy: 8, say: '범어사 보고 산채정식이라니 딱 맞네요' },
    { a: 'beomeosa', b: 'teahouse', joy: 7, say: '절 보고 찻집에서 한숨 돌리는군요' },
    { a: 'beomeosa', b: 'sanseong', joy: 8, say: '범어사에서 산성 막걸리까지, 금정산을 제대로 도네요' },
    // 동래·동구·부산진
    { a: 'dongnaepajeon', b: 'nongshim', joy: 8, say: '파전 먹고 허심청에서 온천이라니, 오늘 잘 자겠어요' },
    { a: 'ibagu', b: 'choryang', joy: 7, say: '이바구길 내려와서 초량 밀면, 동네를 아시는군요' },
    { a: 'seomyeongalbi', b: 'jeonpo', joy: 7, say: '고기 먹고 전포 카페거리라니 자연스럽네요' },
  ],

  quests: [
    {
      id: 'q1', lv: 1, title: '첫 손님 · 바다가 보고 싶어요',
      from: '서울', stamina: 110, staminaType: 'energizer', age: '20대', startDow: 4,
      desc: '서울에서 갑니다. 부산 처음이에요. 바다만 보면 돼요.',
      days: 2, budget: 400000, people: 2, must: ['haeundae'], minSights: 3, endBy: 1260, par: 290
    },
    {
      id: 'q2', lv: 1, title: '뚜벅이 커플 · 알뜰하게',
      from: '대구', stamina: 100, staminaType: 'morning', age: '30대', startDow: 5,
      desc: '대구에서 갑니다. 부산에선 대중교통만 탈게요. 감천이랑 자갈치는 꼭이요!',
      days: 2, budget: 240000, people: 2, must: ['gamcheon', 'jagalchi'], minSights: 4,
      banModes: ['taxi', 'car'], endBy: 1200, par: 441
    },
    {
      id: 'q3', lv: 2, title: '당일치기 출장 뒤풀이',
      from: '대구', stamina: 95, staminaType: 'night', age: '40대', startDow: 2,
      desc: '대구에서 아침에 출발해 당일로 다녀옵니다. 용궁사는 꼭 보고 싶어요. 셋이서 갑니다.',
      days: 1, budget: 260000, people: 3, must: ['yongkungsa'], minSights: 3, endBy: 1380, par: 331
    },
    {
      id: 'q4', lv: 3, title: '부모님 효도여행',
      from: '광주', stamina: 75, staminaType: 'motionsick', age: '60대 이상', startDow: 1,
      desc: '광주에서 부모님 모시고 갑니다. 많이 걷긴 힘드세요. 숙소는 호텔로.',
      // 예산 110만은 4인·3일·호텔 필수에 애초에 모자랐다 — 초과가 감점뿐이던 시절엔 그냥 넘겨서
      // 문제가 안 됐지만, 초과를 실패로 바꾼 뒤로는 풀리지 않는 의뢰가 된다. 광주 KTX 4인 왕복
      // 20만 + 호텔 2박 2객실 + 4인 식사 3일 기준으로 170만이 실제 하한선에 가깝다.
      days: 3, budget: 1700000, people: 4, must: ['taejongdae', 'beomeosa'], minSights: 5,
      minStayTier: 'hotel', endBy: 1140, par: 437
    },
    {
      id: 'q5', lv: 4, title: '아이 둘 데리고 가는 가족',
      from: '제주', stamina: 90, staminaType: 'morning', age: '아이 동반', startDow: 4,
      desc: '제주에서 아이 둘 데리고 갑니다. 롯데월드는 필수! 이동은 편했으면 해요.',
      // 같은 이유로 상향 — 제주 항공 4인 왕복에 롯데월드·아쿠아리움 4인 입장까지 얹으면 120만으로는 안 된다.
      days: 3, budget: 1600000, people: 4, must: ['lotteworld', 'aquarium'], minSights: 6, endBy: 1200, par: 497
    },
    {
      // 2인이라 객실이 1개뿐이라 최고급 호텔이 예산에 들어온다 — 다른 의뢰는 4인이라 2객실이 되어 불가능하다.
      id: 'q6', lv: 5, title: '결혼 10주년 · 하루쯤은 호사스럽게',
      from: '서울', stamina: 95, staminaType: 'night', age: '30대', startDow: 3,
      desc: '서울에서 둘이 갑니다. 결혼 10주년이라 숙소만큼은 최고로 하고 싶어요. 예산은 넉넉합니다.',
      days: 3, budget: 2500000, people: 2, must: ['xthesky'], minSights: 4,
      minStayTier: 'hotel', endBy: 1260, par: 637
    }
  ]
};
