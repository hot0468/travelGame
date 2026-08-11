// assets/fukuoka-map.svg 생성기 — 후쿠오카 일대 행정경계를 그린다.
//   node tools/mkmap-fukuoka.js          (원본은 임시폴더에 캐시된다)
//   node tools/mkmap-fukuoka.js --fresh  캐시 무시하고 다시 받기
//
// 출처: 국토교통성 국토수치정보(행정구역 N03)를 가공해 작성.
//   정부표준이용약관 2.0 — 상업 이용·가공·재배포 모두 자유이고 CC BY 4.0 과 호환된다.
//   출처 표시는 의무다(앱 하단·README 에 남긴다). SA 전염은 없다.
//   중계: github.com/niiyz/JapanCityGeoJson (원본을 시구정촌별 GeoJSON 으로 쪼개 둔 것)
//
// 부산(tools/mkmap.js)과 달리 지역 안의 시구정촌 수가 많아(후쿠오카현 72개) 코드를
// 손으로 고르지 않는다. data/fukuoka.js 의 bounds 안에 걸치는 것만 자동으로 골라 담는다.
const fs = require('fs'), path = require('path'), os = require('os');
const dir = path.join(__dirname, '..');
// 40=후쿠오카현, 44=오이타현(유후인). bounds 에 걸치는 시정촌만 담기므로 현을 더 받아도 안전하다.
const PREFS = ['40', '44'];
const BASE = 'https://raw.githubusercontent.com/niiyz/JapanCityGeoJson/master/geojson/';
const TREE = 'https://api.github.com/repos/niiyz/JapanCityGeoJson/git/trees/master?recursive=1';
const CACHE = path.join(os.tmpdir(), 'fukuoka-map');
const fresh = process.argv.includes('--fresh');
const UA = { 'User-Agent': 'travelGame/1.0 (https://github.com/hot0468/travelGame)' };

const VW = 1080, VH = 520;            // 약도와 같은 캔버스 — mapImage 를 붙여도 투영이 안 바뀐다

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJSON(url, tag) {
  const f = path.join(CACHE, tag + '.json');
  if (!fresh && fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(40000) });
      if (r.ok) { const x = await r.text(); fs.writeFileSync(f, x); return JSON.parse(x); }
    } catch (e) { /* 재시도 */ }
    await sleep(800 * (t + 1));
  }
  return null;
}

(async () => {
  fs.mkdirSync(CACHE, { recursive: true });
  global.window = global;
  eval(fs.readFileSync(path.join(dir, 'data/fukuoka.js'), 'utf8'));
  const B = REGIONS.fukuoka.bounds;
  if (!B) { console.error('data/fukuoka.js 에 bounds 가 없다'); process.exit(1); }

  // 후쿠오카현의 시구정촌 코드 목록
  const tree = await getJSON(TREE, 'tree');
  if (!tree || !tree.tree) { console.error('저장소 목록을 못 받았다'); process.exit(1); }
  const re = new RegExp(`^geojson\\/(${PREFS.join('|')})\\/\\d+\\.json$`);
  const codes = tree.tree.filter(t => re.test(t.path))
    .map(t => { const m = t.path.match(/geojson\/(\d+)\/(\d+)\.json/); return { pref: m[1], c: m[2] }; })
    .sort((a, b) => a.c.localeCompare(b.c));
  console.log(`후쿠오카·오이타현 시구정촌 ${codes.length}개 — bounds 안에 걸치는 것만 고른다`);

  // 위경도 → 캔버스 픽셀. index.html 의 px() 와 같은 선형 투영이라야 장소가 제자리에 온다.
  const PX = ([lng, lat]) => [
    (lng - B.w) / (B.e - B.w) * VW,
    (B.n - lat) / (B.n - B.s) * VH,
  ];
  const r1 = v => Math.round(v * 10) / 10;      // 소수 1자리면 700px 캔버스에 충분하다

  // 화면 좌표에서 이 거리 안쪽으로 벗어나지 않는 점은 버린다. 눈에 안 보이는 굴곡이다.
  const TOL = 0.4;
  // Douglas-Peucker — 선을 가장 크게 벗어나는 점만 남기며 재귀로 쪼갠다
  function simplify(pts) {
    if (pts.length < 3) return pts;
    let far = 0, idx = 0;
    const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i];
      // 양 끝이 같은 점이면(닫힌 고리) 그 점에서의 거리로 잰다
      const d = len < 1e-9 ? Math.hypot(x - ax, y - ay)
                           : Math.abs(dy * x - dx * y + bx * ay - by * ax) / len;
      if (d > far) { far = d; idx = i; }
    }
    if (far <= TOL) return [pts[0], pts[pts.length - 1]];
    return simplify(pts.slice(0, idx + 1)).slice(0, -1).concat(simplify(pts.slice(idx)));
  }

  const rows = [];
  for (const { pref, c } of codes) {
    const g = await getJSON(BASE + pref + '/' + c + '.json', c);
    if (!g || !g.features) continue;
    const f = g.features[0];
    const nm = ((f.properties.N03_004 || f.properties.N03_003 || '') + '').trim();

    // bounds 와 겹치는지 먼저 본다 — 안 겹치면 통째로 건너뛴다
    let minx = 9e9, maxx = -9e9, miny = 9e9, maxy = -9e9;
    const scan = x => { if (typeof x[0] === 'number') {
        if (x[0] < minx) minx = x[0]; if (x[0] > maxx) maxx = x[0];
        if (x[1] < miny) miny = x[1]; if (x[1] > maxy) maxy = x[1];
      } else x.forEach(scan); };
    scan(f.geometry.coordinates);
    if (maxx < B.w || minx > B.e || maxy < B.s || miny > B.n) continue;

    // 링 하나를 path 로. 화면 좌표로 옮긴 뒤 눈에 안 보이는 굴곡을 솎아낸다.
    const ring = pts => {
      let v = pts.map(PX);
      v = simplify(v).map(([x, y]) => [r1(x), r1(y)]);
      // 너무 작아진 조각(자잘한 섬·삐죽한 꼬리)은 통째로 버린다
      if (v.length < 4) return '';
      let d = '', px = null, py = null;
      v.forEach(([x, y], i) => {
        if (i && x === px && y === py) return;
        d += (i ? 'L' : 'M') + x + ' ' + y;
        px = x; py = y;
      });
      return d ? d + 'Z' : '';
    };
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const d = polys.map(poly => poly.map(ring).join('')).join('');
    if (d) rows.push({ nm, d, code: c });
  }
  // 그리는 순서를 고정한다(면적 큰 것부터) — 매번 같은 파일이 나와야 diff 가 깨끗하다
  rows.sort((a, b) => b.d.length - a.d.length);
  console.log(`bounds 안 ${rows.length}곳: ${rows.map(r => r.nm).join(', ')}`);

  const out = `<?xml version="1.0" encoding="utf-8"?>
<!-- 후쿠오카 일대 행정경계.
     출처: 국토교통성 국토수치정보(행정구역)를 가공해 작성.
     정부표준이용약관 2.0 — 상업 이용·가공·재배포 자유, CC BY 4.0 과 호환. 출처 표시는 의무다.
     tools/mkmap-fukuoka.js 가 생성한다(수기 편집 금지).
     좌표계는 data/fukuoka.js 의 bounds 와 같은 선형 투영이다. -->
<svg xmlns="http://www.w3.org/2000/svg" width="${VW}" height="${VH}" viewBox="0 0 ${VW} ${VH}">
  <!-- 바다를 깔고 그 위에 육지를 얹는다. 둘 다 흰색이면 해안선이 배경에 묻힌다. -->
  <rect width="${VW}" height="${VH}" fill="#a8c4cf"/>
  <g fill="#ffffff" stroke="#8fa3b3" stroke-width="1.1" stroke-linejoin="round">
${rows.map(r => `    <path data-gu="${r.nm}" d="${r.d}"/>`).join('\n')}
  </g>
</svg>
`;
  const dest = path.join(dir, 'assets/fukuoka-map.svg');
  fs.writeFileSync(dest, out);
  console.log(`assets/fukuoka-map.svg ${(out.length / 1024).toFixed(0)}KB · 구역 ${rows.length}곳`);
})();
