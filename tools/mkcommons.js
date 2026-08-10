// 위키미디어 커먼즈에서 관광지 사진을 받는다.
//   node tools/mkcommons.js          (사진 없는 관광지만)
//   node tools/mkcommons.js --dry    받지 않고 무엇이 잡히는지만
//   node tools/mkcommons.js --force  이미 있어도 다시
//
// TourAPI 에는 부산 주요 명소가 없다(해운대해수욕장·해동용궁사·오륙도·범어사가 목록에 없다).
// 커먼즈에는 있다 — 대신 사진마다 라이선스가 다르므로 저작자·라이선스를 반드시 남겨야 한다.
// 받은 내역은 assets/photos/credits.json 에 쓰고, 앱이 그걸 읽어 팝업에 표기한다.
//
// 라이선스: CC0·퍼블릭도메인·CC BY·CC BY-SA 만 받는다. NC(비상업)·ND(변경금지)는 거른다 —
// 크롭이 "변경" 이라 ND 는 못 쓰고, 배포물이라 NC 도 못 쓴다.
// CC BY-SA 는 그 사진 파일이 같은 라이선스로 배포된다(코드까지 묶이지는 않는다).
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
const OUT = path.join(dir, 'assets/photos');
const CRED = path.join(OUT, 'credits.json');
const dry = process.argv.includes('--dry');
const force = process.argv.includes('--force');
const API = 'https://commons.wikimedia.org/w/api.php';
const sleep = ms => new Promise(r => setTimeout(r, ms));
// 커먼즈는 User-Agent 를 요구한다(없으면 403 이 나기도 한다).
const UA = 'travelGame/1.0 (https://github.com/hot0468/travelGame)';

// 검색어. 게임 이름 그대로는 잘 안 맞아 영문·별칭을 함께 준다.
// 없는 곳은 빈 배열 — 커먼즈에도 없는 곳이다(F1963·부산도서관 등).
const KW = {
  haeundae:    ['Haeundae Beach', '해운대해수욕장'],
  gwangalli:   ['Gwangalli Beach', '광안리해수욕장'],
  gamcheon:    ['Gamcheon Culture Village', '감천문화마을'],
  biff:        ['BIFF Square Busan'],
  yongdusan:   ['Busan Tower', 'Yongdusan Park'],
  taejongdae:  ['Taejongdae', '태종대'],
  yongkungsa:  ['Haedong Yonggungsa', '해동용궁사'],
  huinyeoul:   ['Huinnyeoul Culture Village', '흰여울문화마을'],
  centum:      ['Centum City Busan'],
  oryukdo:     ['Oryukdo', '오륙도'],
  igidae:      ['Igidae', 'Igidae Coastal', '이기대'],
  xthesky:     ['Haeundae LCT', 'Elysium Tower Haeundae', '엘시티'],
  songjeong:   ['Songjeong Beach', 'Songjeong', '송정해수욕장'],
  hwangnyeong: ['Hwangnyeongsan', '황령산'],
  beomeosa:    ['Beomeosa', '범어사'],
  chungsapo:   ['Cheongsapo', '청사포'],
  mca:         ['Museum of Contemporary Art Busan'],
  choryangi:   ['Choryang Ibagu-gil', '초량이바구길'],
  millaksu:    ['Millak', 'Suyeong River Busan', '민락수변공원'],
  daejeo:      ['Daejeo Ecological Park', '대저생태공원'],
};
// 쓸 수 있는 라이선스만. 크롭이 "변경" 이라 ND 는 못 쓰고, 배포물이라 NC 도 못 쓴다.
const okLicense = l => {
  const t = (l || '').toLowerCase();
  if (/nc|noncommercial|nd|noderiv/.test(t)) return false;
  return /^cc0|public domain|^cc by/.test(t);
};
// 제목에 이런 말이 있으면 그 장소의 대표 사진이 아니다 —
// 검색이 단어만 스쳐도 걸리는 탓에 맥도날드 지점·지하철 승강장·안내소가 잡혔다.
const BAD_TITLE = /mcdonald|starbucks|station|platform|subway|metro|signage|sign\b|information|bureau|map\b|plaque|monument sign|bus stop|parking|toilet|restroom|construction|under construction|logo|poster|banner|ticket|entrance gate only/i;
const titleOk = t => !BAD_TITLE.test(t);

async function j(url) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(15000) }); return await r.json(); }
    catch (e) { await sleep(700 * (i + 1)); }
  }
  return null;
}
const meta = (ii, k) => ((ii.extmetadata || {})[k] || {}).value || '';
const strip = t => String(t).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

(async () => {
  global.window = global;
  eval(fs.readFileSync(path.join(dir, 'data/busan.js'), 'utf8'));
  const pois = REGIONS.busan.pois;
  fs.mkdirSync(OUT, { recursive: true });
  const have = new Set(fs.readdirSync(OUT).filter(f => /\.jpg$/i.test(f)).map(f => f.replace(/\.jpg$/i, '')));
  const credits = fs.existsSync(CRED) ? JSON.parse(fs.readFileSync(CRED, 'utf8')) : {};

  const todo = pois.filter(p => KW[p.id] && (force || !have.has(p.id)));
  console.log(`대상 ${todo.length}곳`);

  let got = 0, skip = 0, none = 0;
  for (const p of todo) {
    // 검색어를 모두 돌려 후보를 모으고 점수로 고른다.
    // 첫 검색어에서 되는대로 집으면 실행마다 결과가 흔들린다(커먼즈 순위가 요동친다).
    const pool = [];
    for (const kw of KW[p.id]) {
      const url = API + '?action=query&format=json&generator=search'
        + '&gsrsearch=' + encodeURIComponent('filetype:bitmap ' + kw)
        + '&gsrnamespace=6&gsrlimit=10&prop=imageinfo'
        + '&iiprop=url|extmetadata&iiurlwidth=1200';
      const r = await j(url);
      const pages = (r && r.query && r.query.pages) || {};
      for (const pg of Object.values(pages)) {
        const ii = (pg.imageinfo || [])[0]; if (!ii) continue;
        const lic = strip(meta(ii, 'LicenseShortName'));
        if (!okLicense(lic)) continue;
        const title = pg.title.replace(/^File:/, '');
        if (!titleOk(title)) continue;
        // 부산 사진인지 확인. Millak 같은 짧은 이름은 세계 어디에나 겹치는 게 있다
        // (민락수변공원 자리에 폴란드 기념패 "Konrad Millak" 이 잡힌 적이 있다).
        const ctx = (title + ' ' + strip(meta(ii, 'ImageDescription')) + ' '
          + strip(meta(ii, 'Categories'))).toLowerCase();
        if (!/busan|pusan|부산|korea|한국/.test(ctx)) continue;
        // 검색어의 고유명사가 제목에 있어야 한다. 하이픈으로 붙은 제목도 잡히게 구분자를 턴다.
        const flat = t => t.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
        const stop = /^(the|and|city|park|beach|temple|busan|korea|square|mountain|view|night|day|from)$/i;
        const key = kw.split(/\s+/).filter(w => w.length > 2 && !stop.test(w));
        const named = !key.length || key.some(w => flat(title).includes(flat(w)));
        if (!named) continue;
        // 점수: 제목이 짧고(군더더기 없음) 라이선스가 자유로울수록 앞선다.
        const licScore = /^cc0|public domain/i.test(lic) ? 3 : /^cc by [0-9.]+$/i.test(lic) ? 2 : 1;
        const score = licScore * 100 - Math.min(title.length, 80);
        if (!pool.some(x => x.title === title)) {
          pool.push({
            title, score,
            url: ii.thumburl || ii.url, lic,
            by: strip(meta(ii, 'Artist')) || '(작자 미상)',
            page: ii.descriptionurl || ('https://commons.wikimedia.org/wiki/' + encodeURIComponent(pg.title))
          });
        }
      }
      await sleep(300);
    }
    pool.sort((a, b) => b.score - a.score);
    const pick = pool[0] || null;
    if (!pick) { none++; console.log(`  ✘ ${p.name} — 쓸 수 있는 사진 없음`); continue; }
    if (dry) { console.log(`  · ${p.name} ← ${pick.title.slice(0, 40)} [${pick.lic}] ${pick.by.slice(0, 24)}`); got++; continue; }

    // 커먼즈는 User-Agent 없는 요청을 막기도 하고 간헐적으로 끊긴다 — 재시도한다.
    let buf = null;
    for (let t = 0; t < 4 && !buf; t++) {
      try {
        const img = await fetch(pick.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(40000) });
        if (img.ok) buf = Buffer.from(await img.arrayBuffer());
      } catch (e) { /* 재시도 */ }
      if (!buf) await sleep(900 * (t + 1));
    }
    if (!buf) { console.log(`  ✘ ${p.name} — 내려받기 실패`); none++; continue; }
    fs.writeFileSync(path.join(OUT, p.id + '.jpg'), buf);
    credits[p.id] = { by: pick.by, lic: pick.lic, src: pick.page, title: pick.title };
    got++;
    console.log(`  ✔ ${p.name} ← ${pick.title.slice(0, 38)} [${pick.lic}]`);
    await sleep(200);
  }
  if (!dry) {
    fs.writeFileSync(CRED, JSON.stringify(credits, null, 1));
    console.log(`\ncredits.json 갱신 (${Object.keys(credits).length}건)`);
  }
  console.log(`받음 ${got} · 못 씀 ${none}`);
  if (!dry && got) console.log('node tools/resize.js 로 크기를 줄여라.');
})();
