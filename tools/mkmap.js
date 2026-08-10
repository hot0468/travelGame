// assets/busan-map-kostat.svg 생성기 — 부산 16개 구·군 경계를 공공데이터로 직접 그린다.
//   node tools/mkmap.js            (원본은 임시폴더에 캐시된다)
//   node tools/mkmap.js --fresh    캐시 무시하고 다시 받기
//
// 왜 새로 그리는가: 기존 지도(위키미디어, © 밥풀떼기)는 CC BY-SA 4.0 이라
// ① 저작자·라이선스·수정여부 표시를 지울 수 없고 ② 파생물이 같은 라이선스에 묶인다(SA 전염).
// 통계청 센서스 행정구역경계는 "Free to share or remix" 라 그 두 제약이 없다.
//
// 출처: 통계청(KOSTAT) 2018 센서스용 행정구역경계.
//   southkorea/southkorea-maps 저장소의 kostat/ 계열을 쓴다.
//   ※ 같은 저장소의 gadm/ 계열은 비상업 전용이라 절대 쓰면 안 된다.
//
// 좌표계·캔버스는 기존 지도와 똑같이 맞춘다(data/busan.js 의 mapImage.bounds/vw/vh).
// 그래야 POI 위경도 → 픽셀 투영이 그대로라 장소 좌표를 하나도 안 건드린다.
const fs = require('fs'), path = require('path'), os = require('os');
const dir = path.join(__dirname, '..');
const SRC = 'https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-municipalities-2018-geo.json';
const CACHE = path.join(os.tmpdir(), 'busan-map');
const fresh = process.argv.includes('--fresh');

const GU = ['중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구', '해운대구',
            '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군'];

(async () => {
  fs.mkdirSync(CACHE, { recursive: true });
  const f = path.join(CACHE, 'kostat2018.json');
  if (fresh || !fs.existsSync(f)) {
    process.stdout.write('원본 내려받는 중… ');
    const r = await fetch(SRC);
    if (!r.ok) { console.error('실패 HTTP ' + r.status); process.exit(1); }
    fs.writeFileSync(f, await r.text());
    console.log('완료');
  }
  const geo = JSON.parse(fs.readFileSync(f, 'utf8'));

  global.window = global;
  eval(fs.readFileSync(path.join(dir, 'data/busan.js'), 'utf8'));
  const MI = REGIONS.busan.mapImage;
  const { w: W, e: E, n: N, s: S } = MI.bounds;
  const VW = MI.vw, VH = MI.vh;

  // 이름만으로는 서울 중구·대구 남구 등과 겹친다. 무게중심이 부산 범위 안인 것만 고른다.
  const centroid = f2 => {
    const c = []; const walk = x => { if (typeof x[0] === 'number') c.push(x); else x.forEach(walk); };
    walk(f2.geometry.coordinates);
    const lng = c.map(p => p[0]), lat = c.map(p => p[1]);
    return [(Math.min(...lng) + Math.max(...lng)) / 2, (Math.min(...lat) + Math.max(...lat)) / 2];
  };
  const feats = geo.features.filter(f2 => {
    if (!GU.includes(f2.properties.name)) return false;
    const [x, y] = centroid(f2);
    return x > 128.7 && x < 129.4 && y > 34.9 && y < 35.45;
  });
  if (feats.length !== 16) { console.error(`구·군 ${feats.length}곳 — 16곳이 아니다`); process.exit(1); }

  // 위경도 → 캔버스 픽셀. index.html 의 px() 와 같은 선형 투영이라야 장소가 제자리에 온다.
  const PX = ([lng, lat]) => [
    ((lng - W) / (E - W) * VW),
    ((N - lat) / (N - S) * VH)
  ];
  // 좌표를 소수 1자리로 줄인다 — 852px 캔버스에서 0.1px 이면 충분하고 파일이 훨씬 작아진다
  const r1 = v => Math.round(v * 10) / 10;
  // 링 하나를 path 명령으로. 같은 점이 이어지면 버려 용량을 더 줄인다.
  const ring = pts => {
    let d = '', px = null, py = null;
    pts.forEach((p, i) => {
      const [x, y] = PX(p).map(r1);
      if (i && x === px && y === py) return;
      d += (i ? 'L' : 'M') + x + ' ' + y;
      px = x; py = y;
    });
    return d ? d + 'Z' : '';
  };
  const toPath = geom => {
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    return polys.map(poly => poly.map(ring).join('')).join('');
  };

  // 그리는 순서를 고정한다(면적 큰 것부터) — 매 실행마다 같은 파일이 나와야 diff 가 깨끗하다
  const rows = feats.map(f2 => ({ nm: f2.properties.name, d: toPath(f2.geometry) }))
                    .sort((a, b) => b.d.length - a.d.length);

  const out = `<?xml version="1.0" encoding="utf-8"?>
<!-- 부산 행정구역 경계.
     출처: 통계청(KOSTAT) 2018 센서스용 행정구역경계 — Free to share or remix.
     tools/mkmap.js 가 생성한다(수기 편집 금지).
     좌표계는 data/busan.js 의 mapImage.bounds 와 같은 선형 투영이다. -->
<svg xmlns="http://www.w3.org/2000/svg" width="${VW}" height="${VH}" viewBox="0 0 ${VW} ${VH}">
  <!-- 바다를 깔고 그 위에 육지를 얹는다. 둘 다 흰색이면 해안선이 배경에 묻힌다. -->
  <rect width="${VW}" height="${VH}" fill="#a8c4cf"/>
  <g fill="#ffffff" stroke="#8fa3b3" stroke-width="1.2" stroke-linejoin="round">
${rows.map(r => `    <path data-gu="${r.nm}" d="${r.d}"/>`).join('\n')}
  </g>
</svg>
`;
  const dest = path.join(dir, 'assets/busan-map-kostat.svg');
  fs.writeFileSync(dest, out);
  console.log(`assets/busan-map-kostat.svg ${(out.length / 1024).toFixed(0)}KB · 구·군 ${rows.length}곳`);
  console.log('구·군:', rows.map(r => r.nm).join(', '));
})();
