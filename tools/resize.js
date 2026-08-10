// assets/photos 의 사진을 팝업에 쓸 크기로 줄인다.
//   node tools/resize.js            (600px 폭, 236:104 비율로 가운데를 잘라낸다)
//   node tools/resize.js --width 800
//
// 왜 필요한가: mkphoto 가 받아오는 원본은 장당 수 MB 다(25장에 13MB). 팝업에서는
// 236x104 로 쓰는데 그대로 두면 배포물만 무거워진다.
//
// 어떻게: sharp·canvas 같은 의존성을 안 쓰는 프로젝트라 헤드리스 Edge 의 캔버스를 빌린다.
// 사진을 data URI 로 심은 HTML 을 만들어 브라우저에서 그리고, 결과를 document.title 로
// 받아온다(tools/probe.ps1 과 같은 수법). 한 번에 여러 장을 처리한다.
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const dir = path.join(__dirname, '..');
const OUT = path.join(dir, 'assets/photos');
const wi = process.argv.indexOf('--width');
const W = wi > 0 ? +process.argv[wi + 1] : 600;
const RATIO = 236 / 104;
const H = Math.round(W / RATIO);
const BATCH = 6;                      // 한 번에 처리할 장수. 너무 많으면 URL·메모리가 커진다

const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
              'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
if (!edge) { console.error('Edge 를 못 찾았다.'); process.exit(1); }

const files = fs.readdirSync(OUT).filter(f => /\.jpg$/i.test(f));
if (!files.length) { console.log('줄일 사진이 없다.'); process.exit(0); }

const before = files.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`${files.length}장 · ${(before / 1e6).toFixed(1)}MB → 폭 ${W}px (${W}x${H})`);

const tmp = path.join(os.tmpdir(), 'resize-' + process.pid);
fs.mkdirSync(tmp, { recursive: true });
let done = 0;

for (let i = 0; i < files.length; i += BATCH) {
  const group = files.slice(i, i + BATCH);
  const imgs = group.map(f => ({
    f, uri: 'data:image/jpeg;base64,' + fs.readFileSync(path.join(OUT, f)).toString('base64')
  }));
  const html = `<!doctype html><meta charset="utf-8"><body><script>
const SRC = ${JSON.stringify(imgs.map(x => x.uri))};
const W = ${W}, H = ${H};
// 가운데를 기준으로 비율에 맞게 잘라 그린다(object-fit: cover 와 같은 계산)
function one(uri) {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      const k = Math.max(W / im.naturalWidth, H / im.naturalHeight);
      const w = im.naturalWidth * k, h = im.naturalHeight * k;
      g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
      res(c.toDataURL('image/jpeg', .82));
    };
    im.onerror = () => res(null);
    im.src = uri;
  });
}
Promise.all(SRC.map(one)).then(list => {
  // title 은 길이 제한이 있으므로 결과를 숨은 요소에 담고 title 로 신호만 준다
  const box = document.createElement('div');
  box.id = 'out'; box.textContent = JSON.stringify(list);
  document.body.appendChild(box);
  document.title = 'DONE';
});
</script></body>`;
  const hf = path.join(tmp, 'r.html');
  fs.writeFileSync(hf, html);
  // --dump-dom 은 렌더 후 DOM 을 통째로 내주므로 결과를 그대로 긁어올 수 있다
  const dom = execFileSync(edge, ['--headless=new', '--disable-gpu', '--virtual-time-budget=25000',
    '--dump-dom', 'file:///' + hf.replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const m = dom.match(/<div id="out">([\s\S]*?)<\/div>/);
  if (!m) { console.error('  결과를 못 읽었다 — 이 묶음은 건너뛴다:', group.join(', ')); continue; }
  let list;
  try { list = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')); }
  catch (e) { console.error('  결과 파싱 실패:', e.message); continue; }
  list.forEach((uri, k) => {
    if (!uri) { console.log(`  ✘ ${group[k]} — 그리지 못했다`); return; }
    const b = Buffer.from(uri.split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT, group[k]), b);
    done++;
  });
  process.stdout.write(`  ${Math.min(i + BATCH, files.length)}/${files.length}\r`);
}
fs.rmSync(tmp, { recursive: true, force: true });

const after = files.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`\n${done}장 줄임 · ${(before / 1e6).toFixed(1)}MB → ${(after / 1e6).toFixed(1)}MB`);
