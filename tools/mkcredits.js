// assets/photos/credits.json → data/photos.js
//   node tools/mkcredits.js
//
// 사진 저작권 표기를 앱이 읽을 수 있는 형태로 굽는다. file:// 에서는 fetch 로 json 을
// 못 읽어(=CORS) script 태그로 실어야 한다. mkcommons.js 로 사진을 받은 뒤 실행한다.
//
// admin.html 로 직접 넣은 사진은 credits.json 에 없다 — 직접 찍었거나 표기가 필요 없는
// 사진이면 그대로 두면 되고, 출처를 밝혀야 하면 credits.json 에 손으로 추가한다.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
const SRC = path.join(dir, 'assets/photos/credits.json');
const DEST = path.join(dir, 'data/photos.js');

const cred = fs.existsSync(SRC) ? JSON.parse(fs.readFileSync(SRC, 'utf8')) : {};
const ids = Object.keys(cred).sort();

let js = `// 사진 저작권 표기. tools/mkcredits.js 가 assets/photos/credits.json 에서 굽는다(수기 편집 금지).
// file:// 에서는 fetch 로 json 을 못 읽어 script 로 싣는다.
//   PHOTO_CREDIT[POI id] = { by: 저작자, lic: 라이선스, src: 출처 URL }
window.PHOTO_CREDIT = {
`;
ids.forEach(k => {
  const c = cred[k];
  js += `  ${JSON.stringify(k)}: { by: ${JSON.stringify(c.by)}, lic: ${JSON.stringify(c.lic)}, src: ${JSON.stringify(c.src)} },\n`;
});
js += '};\n';
fs.writeFileSync(DEST, js);
console.log(`data/photos.js ${ids.length}건`);
