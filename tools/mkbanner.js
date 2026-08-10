// 사진 없는 장소의 자리표시 배너를 만든다.
//   node tools/mkbanner.js          (사진이 없는 곳만)
//   node tools/mkbanner.js --force  이미 배너가 있어도 다시
//   node tools/mkbanner.js --clean  배너만 지운다(진짜 사진은 남긴다)
//
// 식당 64곳·숙소 24곳은 공공사진이 없다. 가게 사진은 초상권·상표가 얽히고,
// "서면 모텔"·"광안리 게스트하우스" 같은 곳은 아예 가상 시설이라 받을 사진이 없다.
// 그래서 실사 대신 유형별 그림을 그려 넣는다 — 저작권 문제가 원천적으로 없다.
//
// 배너는 <id>.svg 로 저장한다. 진짜 사진(.jpg)과 파일형이 갈리므로
// --clean 이 실수로 사진을 지울 일이 없고, 나중에 사진을 넣으면 .jpg 가 우선한다.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
const OUT = path.join(dir, 'assets/photos');
const force = process.argv.includes('--force');
const clean = process.argv.includes('--clean');

const W = 472, H = 208;              // 팝업 236x104 의 2배 (고해상도 화면용)

// 이름에서 무엇을 파는 집인지 알아낸다. 앞에 오는 것이 우선한다.
const FOOD_KIND = [
  [/밀면|국수|칼국수/, 'noodle'], [/국밥|순대|돼지국밥|해장/, 'soup'],
  [/회|스시|어시장|해산물|멸치|생선|복국|대구탕/, 'fish'],
  [/조개|곰장어|어묵/, 'shell'], [/곱창|막창|갈매기살|갈비|삼겹|불고기|주물럭|고기/, 'meat'],
  [/낙지|곱새|물꽁|재첩|순두부|찌개|탕/, 'stew'], [/떡볶이|호떡|씨앗/, 'snack'],
  [/파전|막걸리|산채|정식/, 'jeon'],
];
const foodKind = nm => (FOOD_KIND.find(([re]) => re.test(nm)) || [, 'meal'])[1];

// 유형별 색과 그림. 게임 팔레트(--food #ff9a3d, --stay #b06cff, --sight #4d9aff)를 따른다.
const THEME = {
  noodle: { c1: '#ffd9a8', c2: '#ff9a3d', label: '면·국수' },
  soup:   { c1: '#ffcf9c', c2: '#f0803a', label: '국밥·탕' },
  fish:   { c1: '#a8dcf0', c2: '#3d9ec8', label: '회·해산물' },
  shell:  { c1: '#bfe6dd', c2: '#3fae96', label: '조개·구이' },
  meat:   { c1: '#ffc0b0', c2: '#e0663f', label: '고기·구이' },
  stew:   { c1: '#ffc9a0', c2: '#e8752f', label: '찌개·볶음' },
  snack:  { c1: '#ffd0dd', c2: '#ff6f9c', label: '분식' },
  jeon:   { c1: '#f2dfa8', c2: '#c99a2e', label: '전·한식' },
  meal:   { c1: '#ffd9a8', c2: '#ff9a3d', label: '식당' },
  cafe:   { c1: '#e8d5c0', c2: '#a3714a', label: '카페' },
  guesthouse: { c1: '#dcd0f5', c2: '#8a63c8', label: '게스트하우스' },
  motel:      { c1: '#d5c8f0', c2: '#9b6cff', label: '모텔' },
  hotel:      { c1: '#cfc0f0', c2: '#7d4fc0', label: '호텔' },
  culture:  { c1: '#bcd8ff', c2: '#4d9aff', label: '문화시설' },
  photo:    { c1: '#c8dcff', c2: '#5a86d8', label: '포토스팟' },
  activity: { c1: '#b8e0f5', c2: '#3d92c8', label: '액티비티' },
  nature:   { c1: '#c2e8c8', c2: '#4aa85e', label: '자연' },
  shopping: { c1: '#ffd4c0', c2: '#e07a3d', label: '쇼핑' },
};

// 그림 — 굵은 선 몇 개로 알아볼 수 있게. index.html 의 아이콘 톤과 맞춘다.
const ART = {
  noodle: `<path d="M-34 6h68a34 34 0 0 1-68 0z"/><path d="M-26-16c0 8 6 10 6 18M-10-22c0 9 6 11 6 20M6-20c0 9 6 11 6 20M22-14c0 8 6 10 6 18" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-40 6h80" stroke-width="6" stroke-linecap="round"/>`,
  soup:   `<path d="M-32-4h64a32 32 0 0 1-64 0z"/><path d="M-40-4h80" stroke-width="6" stroke-linecap="round"/><path d="M-16-30c0 8 6 8 6 16M4-32c0 8 6 8 6 16" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  fish:   `<path d="M-34 0c10-16 30-22 44-16 10 4 16 10 20 16-4 6-10 12-20 16-14 6-34 0-44-16z"/><path d="M30-14l14-10v48l-14-10"/><circle cx="-14" cy="-4" r="4" fill="var(--k)" stroke="none"/>`,
  shell:  `<path d="M0 16c-20 0-34-14-34-30 0-4 4-6 8-4l26 12 26-12c4-2 8 0 8 4 0 16-14 30-34 30z"/><path d="M0-6v22M-16-14l8 26M16-14l-8 26" stroke-width="3" fill="none" opacity=".45"/>`,
  meat:   `<path d="M-28-14a22 22 0 0 1 44 0c8 0 14 6 14 14s-6 14-14 14h-44a14 14 0 0 1 0-28z"/><circle cx="-6" cy="0" r="5" fill="var(--k)" stroke="none"/><circle cx="12" cy="6" r="4" fill="var(--k)" stroke="none"/>`,
  stew:   `<path d="M-30-8h60v6a30 30 0 0 1-60 0z"/><path d="M-38-8h76" stroke-width="6" stroke-linecap="round"/><path d="M-30-8c0-10 60-10 60 0" fill="none" stroke-width="4"/><path d="M-12-30c0 7 5 7 5 14M8-32c0 7 5 7 5 14" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  snack:  `<rect x="-30" y="-10" width="60" height="22" rx="11"/><rect x="-30" y="-26" width="60" height="22" rx="11" opacity=".55"/><path d="M-38 12h76" stroke-width="6" stroke-linecap="round"/>`,
  jeon:   `<ellipse cx="0" cy="0" rx="36" ry="20"/><ellipse cx="-13" cy="-5" rx="7" ry="4" fill="var(--k)" stroke="none"/><ellipse cx="10" cy="4" rx="8" ry="4" fill="var(--k)" stroke="none"/><ellipse cx="4" cy="-9" rx="5" ry="3" fill="var(--k)" stroke="none"/>`,
  meal:   `<path d="M-26-26v26a8 8 0 0 0 16 0v-26M-18-26v52" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M18-26c-8 0-12 10-12 20s4 12 8 12v20" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  cafe:   `<path d="M-26-16h44v22a22 22 0 0 1-44 0z"/><path d="M18-10h10a10 10 0 0 1 0 20h-10" fill="none" stroke-width="5"/><path d="M-34 22h60" stroke-width="6" stroke-linecap="round"/><path d="M-14-32c0 7 5 7 5 12M2-34c0 7 5 7 5 12" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  guesthouse: `<path d="M-32 4L0-22l32 26" fill="none" stroke-width="6" stroke-linejoin="round"/><path d="M-24 2v22h48V2"/><rect x="-8" y="8" width="16" height="16" fill="var(--k)" stroke="none"/>`,
  motel:  `<rect x="-34" y="-16" width="68" height="34" rx="4"/><rect x="-24" y="-8" width="14" height="12" fill="var(--k)" stroke="none"/><rect x="-4" y="-8" width="14" height="12" fill="var(--k)" stroke="none"/><rect x="16" y="-8" width="12" height="12" fill="var(--k)" stroke="none"/><path d="M-40 18h80" stroke-width="6" stroke-linecap="round"/>`,
  hotel:  `<rect x="-26" y="-30" width="52" height="52" rx="4"/><rect x="-16" y="-22" width="10" height="10" fill="var(--k)" stroke="none"/><rect x="-2" y="-22" width="10" height="10" fill="var(--k)" stroke="none"/><rect x="-16" y="-8" width="10" height="10" fill="var(--k)" stroke="none"/><rect x="-2" y="-8" width="10" height="10" fill="var(--k)" stroke="none"/><rect x="-7" y="6" width="14" height="16" fill="var(--k)" stroke="none"/>`,
  culture:`<path d="M-34-6L0-26l34 20" fill="none" stroke-width="6" stroke-linejoin="round"/><rect x="-28" y="-4" width="8" height="26"/><rect x="-10" y="-4" width="8" height="26"/><rect x="8" y="-4" width="8" height="26"/><path d="M-36 24h72" stroke-width="6" stroke-linecap="round"/>`,
  photo:  `<rect x="-32" y="-18" width="64" height="42" rx="6"/><circle cx="0" cy="3" r="13" fill="var(--k)" stroke="none"/><rect x="-12" y="-26" width="24" height="10" rx="3"/>`,
  activity:`<circle cx="0" cy="-18" r="9"/><path d="M0-8v20M-16 26l16-14 16 14M-18 2h36" fill="none" stroke-width="6" stroke-linecap="round"/>`,
  nature: `<path d="M0-28l30 40h-60z"/><path d="M0-6l24 32h-48z"/><rect x="-5" y="22" width="10" height="8"/>`,
  shopping:`<path d="M-26-12h52l-5 36h-42z"/><path d="M-12-12v-8a12 12 0 0 1 24 0v8" fill="none" stroke-width="5"/>`,
};

function svg(kind, name) {
  const t = THEME[kind] || THEME.meal;
  const art = ART[kind] || ART.meal;
  // 배경은 은은한 사선 줄무늬 — 실사 사진과 확실히 구분되게 한다
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.c1}"/><stop offset="1" stop-color="${t.c2}"/>
    </linearGradient>
    <pattern id="p" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="9" height="18" fill="#fff" opacity=".07"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#p)"/>
  <g transform="translate(${W / 2} ${H / 2 - 10}) scale(1.5)" fill="#fff" stroke="#fff"
     stroke-width="2" opacity=".95" style="--k:${t.c2}">
    ${art}
  </g>
  <text x="${W / 2}" y="${H - 22}" text-anchor="middle" fill="#fff" opacity=".95"
    font-family="'Malgun Gothic',sans-serif" font-size="19" font-weight="700">${t.label}</text>
</svg>
`;
}

(async () => {
  global.window = global;
  eval(fs.readFileSync(path.join(dir, 'data/busan.js'), 'utf8'));
  const pois = REGIONS.busan.pois;
  fs.mkdirSync(OUT, { recursive: true });

  if (clean) {
    const gone = fs.readdirSync(OUT).filter(f => /\.svg$/i.test(f));
    gone.forEach(f => fs.unlinkSync(path.join(OUT, f)));
    console.log(`배너 ${gone.length}개 지움 (사진 .jpg 는 그대로)`);
    return;
  }

  const jpg = new Set(fs.readdirSync(OUT).filter(f => /\.jpg$/i.test(f)).map(f => f.replace(/\.jpg$/i, '')));
  const svgHave = new Set(fs.readdirSync(OUT).filter(f => /\.svg$/i.test(f)).map(f => f.replace(/\.svg$/i, '')));

  let n = 0; const tally = {};
  pois.forEach(p => {
    if (jpg.has(p.id)) return;                       // 진짜 사진이 있으면 배너는 필요 없다
    if (!force && svgHave.has(p.id)) return;
    const kind = p.type === 'food' ? (p.sub === 'cafe' ? 'cafe' : foodKind(p.name))
               : p.type === 'stay' ? (p.tier || 'motel')
               : (p.sub || 'culture');
    fs.writeFileSync(path.join(OUT, p.id + '.svg'), svg(kind, p.name));
    tally[kind] = (tally[kind] || 0) + 1;
    n++;
  });
  console.log(`배너 ${n}개 생성`);
  Object.entries(tally).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${(THEME[k] || {}).label || k}: ${v}`));
})();
