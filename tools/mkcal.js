// 미리보기 페이지 생성기: index.html 의 시작 지점에 상태 주입 코드를 끼워 _cal.html 을 만든다.
//   node tools/mkcal.js -e "S.quest=REGIONS.busan.quests[0]; S.xp=600; render();"
//   node tools/mkcal.js inject.js          (파일에서 읽기)
//   --freeze  캡처용으로 CSS 애니메이션 정지 (헤드리스는 0% 프레임에 멈추므로)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const freeze = args.includes('--freeze');
const rest = args.filter(a => a !== '--freeze');

let inject;
if (rest[0] === '-e') inject = rest[1];
else if (rest[0]) inject = fs.readFileSync(rest[0], 'utf8');
else { console.error('사용법: node tools/mkcal.js [-e "코드" | 파일] [--freeze]'); process.exit(1); }

const MARK0 = '// 시작\nrender();';
let h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
// index.html 이 CRLF 로 저장돼 있으면 \n 기준 마커가 안 맞는다. 파일 개행에 맞춰 찾는다.
const nl = t => h.includes('\r\n') ? t.replace(/\n/g, '\r\n') : t;
const MARK = nl(MARK0);
if (!h.includes(MARK)) { console.error('시작 마커를 못 찾음 — index.html 구조가 바뀌었나?'); process.exit(1); }
h = h.replace(MARK, nl('// 시작\n') + inject + nl('\nrender();'));
if (freeze) h = h.replace('</style>', '  *,*::before,*::after{animation:none!important;transition:none!important}\n</style>');
fs.writeFileSync(path.join(root, '_cal.html'), h);
console.log('_cal.html 생성' + (freeze ? ' (애니메이션 정지)' : ''));
