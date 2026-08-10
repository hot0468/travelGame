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

// 이름으로 찾는다. 게임 이름은 "신세계 센텀시티" 처럼 수식이 붙어 있어 그대로는 잘 안 맞는다.
function keywords(p) {
  const n = p.name;
  const out = [n];
  // 가운뎃점·괄호로 묶인 별칭을 쪼갠다: "용두산공원·부산타워" → 둘 다 시도
  n.split(/[·()]/).map(s => s.trim()).filter(s => s.length > 1).forEach(s => { if (!out.includes(s)) out.push(s); });
  // 앞 수식어를 떼어 본다: "신세계 센텀시티" → "센텀시티"
  const sp = n.split(' ');
  if (sp.length > 1) out.push(sp.slice(1).join(' '), sp[0]);
  return [...new Set(out)].filter(s => s.length > 1).slice(0, 4);
}

(async () => {
  global.window = global;
  eval(fs.readFileSync(path.join(dir, 'data/busan.js'), 'utf8'));
  const pois = REGIONS.busan.pois;
  fs.mkdirSync(OUT, { recursive: true });

  const have = new Set(fs.readdirSync(OUT).filter(f => /\.jpg$/i.test(f)).map(f => f.replace(/\.jpg$/i, '')));
  const todo = pois.filter(p => force || !have.has(p.id));
  console.log(`대상 ${todo.length}곳 (이미 있음 ${have.size}곳)`);

  let got = 0, skipCpy = 0, notFound = 0;
  for (const p of todo) {
    let hit = null;
    for (const kw of keywords(p)) {
      // areaCode=6 은 부산. 지역을 묶어야 동명이인을 덜 잡는다.
      const rows = await api('searchKeyword2', `areaCode=6&numOfRows=5&pageNo=1&keyword=${encodeURIComponent(kw)}`);
      hit = rows.find(r => r.firstimage);
      if (hit) break;
    }
    if (!hit) { notFound++; console.log(`  ✘ ${p.name} — 못 찾음`); continue; }

    // 저작권 확인. 상세조회로 cpyrhtDivCd 를 본다.
    const det = await api('detailCommon2', `contentId=${hit.contentid}`);
    const cpy = (det[0] || {}).cpyrhtDivCd || '';
    if (!OK_CPY[cpy]) {
      skipCpy++;
      console.log(`  ⊘ ${p.name} — 저작권 ${cpy || '미표기'} 이라 건너뜀`);
      continue;
    }
    if (dry) { console.log(`  · ${p.name} ← ${hit.title} (${OK_CPY[cpy]})`); got++; continue; }

    const img = await fetch(hit.firstimage);
    if (!img.ok) { console.log(`  ✘ ${p.name} — 이미지 내려받기 실패`); notFound++; continue; }
    fs.writeFileSync(path.join(OUT, p.id + '.jpg'), Buffer.from(await img.arrayBuffer()));
    got++;
    console.log(`  ✔ ${p.name} ← ${hit.title} (${OK_CPY[cpy]})`);
    await sleep(120);
  }
  console.log(`\n받음 ${got} · 저작권으로 건너뜀 ${skipCpy} · 못 찾음 ${notFound}`);
  if (!dry && got) {
    console.log('원본 크기 그대로다. admin.html 로 열어 구도를 잡고 다시 저장하면 팝업 비율에 맞는다.');
  }
})();
