// data/reviews.js 생성기 — 장소마다 리뷰 3개를 만든다.
//   node tools/mkreview.js
//
// 리뷰는 **읽기 전용 힌트**다. 점수·체력에 관여하지 않고, 이미 있는 게임 규칙
// (짐·도보·연령 선호·휴무·영업시간)을 손님 말투로 드러낸다. 규칙을 데이터에서 읽어
// 쓰므로 값이 바뀌면 리뷰도 따라 바뀐다 — 화면과 계산이 어긋날 일이 없다.
//
// 왜 굽는가: 브라우저에서 매번 만들면 render() 마다 175곳 × 3개를 다시 고르게 된다.
// 무작위가 섞여 있어 팝업을 여닫을 때마다 문장이 바뀌기도 한다. 미리 구우면 고정된다.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');

// 시드 고정 — 실행할 때마다 리뷰가 바뀌면 diff 가 지저분해진다.
let _seed = 0x5bf03635;
const rnd = () => {
  _seed = _seed + 0x6D2B79F5 | 0;
  let t = Math.imul(_seed ^ _seed >>> 15, 1 | _seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const pick = a => a[(rnd() * a.length) | 0];
// 겹치지 않게 n개 뽑는다
const pickN = (a, n) => {
  const c = a.slice();
  for (let i = c.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [c[i], c[j]] = [c[j], c[i]]; }
  return c.slice(0, n);
};

// ── 리뷰 후보. 조건(when)이 맞는 것만 후보에 든다.
// 게임 규칙과 이어지는 말을 우선한다 — 읽고 나면 동선을 다시 보게 되는 문장들이다.
const BANK = [
  // 접근성 — 짐·도보 규칙과 이어진다
  { w: c => c.farStation, t: ['역에서 꽤 걸어야 합니다. 캐리어 끌고 가긴 힘들어요.',
                              '대중교통으로 가기엔 좀 멀어요. 택시 타는 게 마음 편합니다.',
                              '걷는 시간이 길어서 부모님 모시고는 힘들 거 같아요.'] },
  { w: c => c.nearStation, t: ['역에서 바로라 짐 있어도 부담 없어요.',
                               '지하철역 나오자마자라 찾기 쉽습니다.',
                               '역이랑 붙어 있어서 비 와도 걱정 없었어요.'] },
  { w: c => c.uphill, t: ['오르막이 있어서 편한 신발 신고 가세요.',
                          '계단이 많습니다. 유모차는 좀 버거워요.'] },
  // 주차 — 렌터카를 고른 사람에게 쓸모 있는 말
  { w: c => c.parking, t: ['주차가 편합니다.', '주차장이 넓어서 차로 가기 좋아요.'] },
  { w: c => c.noParking, t: ['주차가 어려워요. 차는 두고 오시는 게 낫습니다.',
                             '근처에 댈 데가 마땅찮아 결국 유료주차장에 세웠어요.'] },
  // 일행 규모
  { w: c => c.group, t: ['단체석 있습니다.', '일행 많아도 자리가 넉넉했어요.'] },
  { w: c => c.small, t: ['자리가 몇 개 없어서 웨이팅이 있어요.',
                         '테이블이 작아 넷이 앉기엔 좁습니다.'] },
  // 연령 — ageTypes 선호와 이어진다
  { w: c => c.forOld, t: ['단맛이 강하지 않아서 어르신들이 좋아했어요.',
                          '조용해서 부모님과 다니기 좋았습니다.',
                          '앉아서 쉴 데가 있어 어른들 모시고 오기 괜찮아요.'] },
  { w: c => c.forKid, t: ['아이가 제일 좋아했던 곳이에요.',
                          '아이들 데리고 오기 좋습니다. 뛰어놀 데가 있어요.'] },
  { w: c => c.forYoung, t: ['사진 찍을 데가 많아요. 젊은 친구들이 많더라고요.',
                            '인생샷 건지기 좋습니다.'] },
  // 시간대
  // 24시간 영업(호텔·락커)도 night 로 잡히지만 "밤에 가면 분위기가" 는 안 어울린다.
  { w: c => c.night, no: 'stay locker', t: ['밤에 가면 분위기가 완전히 달라요.',
                         '늦게까지 해서 저녁 늦게 들러도 됩니다.'] },
  { w: c => c.morning, no: 'stay locker', t: ['아침 일찍 가야 한산합니다.',
                           '오전에 갔더니 사람이 없어 좋았어요.'] },
  { w: c => c.closed, t: ['쉬는 날 모르고 갔다가 헛걸음했어요. 확인하고 가세요.'] },
  // 값
  { w: c => c.cheap, no: 'locker', t: ['값에 비해 훌륭합니다.', '가격 착해요. 부담 없이 갈 만합니다.'] },
  { w: c => c.pricey, no: 'locker', t: ['값은 좀 나가지만 한 번은 가볼 만해요.',
                          '생각보다 비쌌어요. 예산 잡고 가세요.'] },
  // 체류
  { w: c => c.long, no: 'stay locker', t: ['제대로 보려면 두어 시간은 잡아야 합니다.',
                        '생각보다 오래 걸려요. 일정 넉넉히 잡으세요.'] },
  { w: c => c.quick, no: 'stay locker', t: ['금방 둘러봅니다. 지나는 길에 들르기 좋아요.'] },
  // 유형별 맛/분위기 — 무난한 채움말
  { w: c => c.meal, t: ['현지인이 많은 걸 보니 믿을 만합니다.',
                        '줄 서서 먹었는데 아깝지 않았어요.',
                        '양이 넉넉해서 든든했습니다.'] },
  { w: c => c.cafe, t: ['커피 맛이 좋아요. 자리도 편합니다.',
                        '오래 앉아 있기 좋은 자리예요.'] },
  { w: c => c.stay, t: ['체크인이 빨라서 좋았어요.', '방은 좁지만 깔끔합니다.',
                        '위치가 좋아 어디든 나가기 편했어요.'] },
  { w: c => c.locker, t: ['짐 맡기고 다니니 훨씬 가볍습니다.',
                          '큰 캐리어도 들어가요. 자리가 없을 때가 있으니 일찍 가세요.'] },
  { w: c => c.view, t: ['경치가 좋습니다. 날 좋을 때 가세요.'] },
  // 어디에나 붙는 말 — 후보가 모자랄 때 채운다. 짐 맡기는 곳에는 안 쓴다.
  { w: () => true, no: 'locker', t: ['다시 가고 싶어요.', '기대한 만큼은 했습니다.',
                       '사람이 많아 조금 붐볐어요.', '무난했습니다.'] },
  // 락커 전용 채움말
  { w: c => c.locker, t: ['24시간이라 언제든 찾을 수 있어 편했어요.',
                          '동전만 되는 줄 알았는데 카드도 됩니다.',
                          '자리가 꽉 차 있을 때가 있어요. 다른 층도 보세요.'] },
];
// 그 장소가 어떤 종류인지 한 낱말로. 항목의 no 와 맞춰 후보를 거른다.
const kindOf = c => c.locker ? 'locker' : c.stay ? 'stay' : c.cafe ? 'cafe'
              : c.meal ? 'meal' : 'sight';

(async () => {
  global.window = global;
  // 지역·부속 파일을 모두 읽는다(지하철 좌표가 있어야 역 거리를 잰다)
  fs.readdirSync(path.join(dir, 'data')).filter(f => /\.js$/.test(f))
    .forEach(f => { try { eval(fs.readFileSync(path.join(dir, 'data', f), 'utf8')); } catch (e) { } });

  const RAD = 6371, rd = d => d * Math.PI / 180;
  const km = (a, b) => {
    const dl = rd(b[0] - a[0]), dg = rd(b[1] - a[1]);
    const h = Math.sin(dl / 2) ** 2 + Math.cos(rd(a[0])) * Math.cos(rd(b[0])) * Math.sin(dg / 2) ** 2;
    return 2 * RAD * Math.asin(Math.sqrt(h));
  };

  const out = {};
  let total = 0;
  for (const key of Object.keys(REGIONS)) {
    const R = REGIONS[key];
    if (!R.pois || !R.pois.length) continue;
    // 그 지역 역 좌표 전부(지하철 + 사철)
    const pos = (R.subway && R.subway.pos) || {};
    const stKm = p => {
      let best = Infinity;
      for (const k in pos) { const d = km([p.lat, p.lng], pos[k]); if (d < best) best = d; }
      return best;
    };
    // 연령대가 좋아하는 sub 인지
    const likedBy = sub => Object.entries(R.ageTypes || {})
      .filter(([, a]) => (a.likes || []).includes(sub)).map(([n]) => n);

    R.pois.forEach(p => {
      const d = stKm(p);
      const liked = likedBy(p.sub);
      const foods = R.pois.filter(x => x.type === 'food').map(x => x.cost).sort((a, b) => a - b);
      const mid = foods[foods.length >> 1] || 12000;
      const c = {
        farStation: d > 2 || (p.access || 0) >= 15,
        nearStation: d < .4,
        uphill: (p.access || 0) >= 10,
        // 주차: 역에서 멀면 대개 주차가 되고, 도심 한복판은 어렵다
        parking: d > 1.5 && p.type !== 'food',
        noParking: d < .5 && (p.type === 'food' || p.sub === 'shopping'),
        group: p.type === 'food' && p.cost >= mid,
        small: p.type === 'food' && p.cost < mid * .7,
        forOld: liked.some(n => /60대|이상/.test(n)),
        forKid: liked.some(n => /아이/.test(n)),
        forYoung: liked.some(n => /20대|30대/.test(n)),
        night: p.open[1] < p.open[0] || p.open[1] >= 1380,
        morning: p.open[0] <= 420 && p.open[0] > 0,
        closed: !!(p.closed && p.closed.length),
        cheap: p.cost > 0 && p.cost < mid * .6,
        pricey: p.cost >= mid * 2,
        long: p.stay >= 120,
        quick: p.stay > 0 && p.stay <= 40,
        meal: p.type === 'food' && p.sub !== 'cafe',
        cafe: p.sub === 'cafe',
        stay: p.type === 'stay',
        locker: p.sub === 'locker',
        view: /nature|photo/.test(p.sub || ''),
      };
      // 조건이 맞는 후보를 모아 3개를 뽑는다. 같은 항목에서 두 번 뽑지 않는다.
      const kind = kindOf(c);
      const bank = BANK.filter(b => b.w(c) && !(b.no || '').split(' ').includes(kind));
      const rows = pickN(bank, Math.min(3, bank.length)).map(b => pick(b.t));
      // 모자라면 아무 데나 붙는 말로 채운다
      // 모자라면 그 종류에 맞는 아무 말로 채운다
      const filler = BANK.filter(b => !(b.no || '').split(' ').includes(kind)
                                   && (b.w === BANK.at(-2).w || b.w === BANK.at(-1).w));
      let guard = 0;
      while (rows.length < 3 && guard++ < 40) {
        const t = pick(pick(filler.length ? filler : [BANK.at(-2)]).t);
        if (!rows.includes(t)) rows.push(t);
      }
      out[p.id] = rows;
      total += rows.length;
    });
  }

  const q = s => JSON.stringify(s);
  let js = `// 장소 리뷰 — tools/mkreview.js 가 생성한다(수기 편집 금지).
//
// **읽기 전용 힌트**다. 점수·체력에 관여하지 않는다. 이미 있는 게임 규칙
// (짐·도보·연령 선호·휴무·영업시간·가격)을 손님 말투로 드러낼 뿐이다.
// 장소 데이터가 바뀌면 다시 구워야 내용이 따라온다.
window.REVIEWS = {
`;
  Object.keys(out).sort().forEach(id => {
    js += `  ${q(id)}: [${out[id].map(q).join(', ')}],\n`;
  });
  js += '};\n';
  fs.writeFileSync(path.join(dir, 'data/reviews.js'), js);
  console.log(`data/reviews.js ${(js.length / 1024).toFixed(0)}KB · 장소 ${Object.keys(out).length} · 리뷰 ${total}개`);
})();
