// assets/photos/ 채우기 — 한국관광공사 TourAPI 에서 관광지 대표사진을 받아 저장한다.
//   node tools/mkphoto.js            (이미 있는 사진은 건너뛴다)
//   node tools/mkphoto.js --force    있어도 다시 받기
//   node tools/mkphoto.js --dry      받지 않고 어떤 사진이 잡히는지만 본다
//
// .apikey 에 TOUR_API_KEY=... 한 줄이 필요하다(공공데이터포털 → 한국관광공사_국문 관광정보
// 서비스 활용신청 → Encoding 키). BIMS 키와는 다른 서비스라 따로 신청해야 한다.
//
// 한계: TourAPI 는 관광지 위주다. 식당·카페·숙소(104곳)는 대부분 안 잡히므로
// admin.html 로 직접 넣어야 한다. 관광지 32곳도 이름이 안 맞으면 못 찾는다.
//
// 라이선스: TourAPI 사진은 항목마다 저작권이 다르다. 응답의 저작권 구분(cpyrhtDivCd)이
// "Type1"(출처표시-변경금지) 또는 "Type3"(공공누리 제1유형)인 것만 받는다.
// 그 외(제한적 이용)는 건너뛴다 — 배포물에 들어가므로 함부로 못 쓴다.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
const OUT = path.join(dir, 'assets/photos');
const force = process.argv.includes('--force');
const dry = process.argv.includes('--dry');

const keyFile = path.join(dir, '.apikey');
const KEY = fs.existsSync(keyFile)
  ? (fs.readFileSync(keyFile, 'utf8').match(/^TOUR_API_KEY=(.+)$/m) || [])[1] : null;
if (!KEY) {
  console.error('.apikey 에 TOUR_API_KEY=... 가 없다.');
  console.error('공공데이터포털에서 「한국관광공사_국문 관광정보 서비스」 활용신청 후');
  console.error('Encoding 키를 넣어라. BIMS 키와는 다른 서비스다.');
  process.exit(1);
}
const BASE = 'https://apis.data.go.kr/B551011/KorService2';
const COMMON = `serviceKey=${KEY}&MobileOS=ETC&MobileApp=travelGame&_type=json`;
// 배포해도 되는 저작권 구분만 받는다
const OK_CPY = { Type1: '출처표시-변경금지', Type3: '공공누리 1유형' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(op, qs) {
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(`${BASE}/${op}?${COMMON}&${qs}`);
      const txt = await r.text();
      if (txt.includes('LIMITED_NUMBER_OF_SERVICE')) { console.error('일일 호출 한도 초과'); process.exit(1); }
      const j = JSON.parse(txt);
      const body = j.response && j.response.body;
      if (!body) return [];
      const it = body.items && body.items.item;
      return !it ? [] : Array.isArray(it) ? it : [it];
    } catch (e) { /* 재시도 */ }
    await sleep(400 * (t + 1));
  }
  return [];
}

// 이름 정규화 — 공백·가운뎃점·괄호를 털어 비교용 문자열을 만든다
const norm = t => (t || '').replace(/[\s·()\[\]{},.'"~\-–—]/g, '').toLowerCase();
// 두 이름이 얼마나 겹치는가(0~1). 문자 2-gram 의 자카드 유사도.
function sim(a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const gram = t => { const s = new Set(); for (let i = 0; i < t.length - 1; i++) s.add(t.slice(i, i + 2)); return s; };
  const A = gram(a), B = gram(b);
  if (!A.size || !B.size) return 0;
  let hit = 0; A.forEach(g => { if (B.has(g)) hit++; });
  return hit / (A.size + B.size - hit);
}
// 후보 중 가장 잘 맞는 것. 문턱 아래면 null — 엉뚱한 사진이 붙느니 없는 게 낫다.
const MIN_SIM = .55;
function bestMatch(name, rows) {
  let best = null;
  rows.forEach(r => {
    if (!r.firstimage) return;
    const a = norm(name), b = norm(r.title);
    // 한쪽이 다른 쪽을 통째로 품으면 같은 곳으로 본다(부산 자갈치시장 ⊃ 자갈치시장)
    const contain = a.length > 3 && b.length > 3 && (a.includes(b) || b.includes(a));
    const sc = contain ? Math.max(.8, sim(name, r.title)) : sim(name, r.title);
    if (!best || sc > best.sc) best = { row: r, sc };
  });
  return best && best.sc >= MIN_SIM ? best : null;
}

(async () => {
  global.window = global;
  eval(fs.readFileSync(path.join(dir, 'data/busan.js'), 'utf8'));
  const pois = REGIONS.busan.pois;
  fs.mkdirSync(OUT, { recursive: true });

  const have = new Set(fs.readdirSync(OUT).filter(f => /\.jpg$/i.test(f)).map(f => f.replace(/\.jpg$/i, '')));
  const todo = pois.filter(p => force || !have.has(p.id));
  console.log(`대상 ${todo.length}곳 (이미 있음 ${have.size}곳)`);

  // 부산 전체 목록을 미리 받아 둔다. 키워드 검색만으로는 유명 관광지도 곧잘 놓친다.
  process.stdout.write('부산 관광정보 목록 받는 중… ');
  const pool = [];
  for (let pg = 1; pg <= 12; pg++) {
    const rows = await api('areaBasedList2', `areaCode=6&numOfRows=100&pageNo=${pg}&arrange=A`);
    if (!rows.length) break;
    pool.push(...rows.filter(r => r.firstimage));
    if (rows.length < 100) break;
  }
  console.log(pool.length + '건');

  let got = 0, skipCpy = 0, notFound = 0;
  for (const p of todo) {
    // ① 지역 목록에서 이름이 가장 잘 맞는 것
    let best = bestMatch(p.name, pool);
    // ② 그래도 없으면 키워드 검색으로 한 번 더
    if (!best) {
      const rows = await api('searchKeyword2', `areaCode=6&numOfRows=10&pageNo=1&keyword=${encodeURIComponent(p.name)}`);
      best = bestMatch(p.name, rows);
    }
    if (!best) { notFound++; console.log(`  ✘ ${p.name} — 맞는 항목 없음`); continue; }
    const hit = best.row;

    // 저작권 확인. 상세조회로 cpyrhtDivCd 를 본다.
    const det = await api('detailCommon2', `contentId=${hit.contentid}`);
    const cpy = (det[0] || {}).cpyrhtDivCd || '';
    if (!OK_CPY[cpy]) {
      skipCpy++;
      console.log(`  ⊘ ${p.name} — 저작권 ${cpy || '미표기'} 이라 건너뜀`);
      continue;
    }
    if (dry) { console.log(`  · ${p.name} ← ${hit.title} (${(best.sc * 100).toFixed(0)}% · ${OK_CPY[cpy]})`); got++; continue; }

    const img = await fetch(hit.firstimage);
    if (!img.ok) { console.log(`  ✘ ${p.name} — 이미지 내려받기 실패`); notFound++; continue; }
    fs.writeFileSync(path.join(OUT, p.id + '.jpg'), Buffer.from(await img.arrayBuffer()));
    got++;
    console.log(`  ✔ ${p.name} ← ${hit.title} (${(best.sc * 100).toFixed(0)}% · ${OK_CPY[cpy]})`);
    await sleep(120);
  }
  console.log(`\n받음 ${got} · 저작권으로 건너뜀 ${skipCpy} · 못 찾음 ${notFound}`);
  if (!dry && got) {
    console.log('원본 크기 그대로다. admin.html 로 열어 구도를 잡고 다시 저장하면 팝업 비율에 맞는다.');
  }
})();
