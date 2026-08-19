// 장소 리뷰(data/reviews.js) 검증 — 빠짐없이 있는가, 내용이 장소와 맞는가.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
global.window = global;
fs.readdirSync(path.join(dir, 'data')).filter(f => /\.js$/.test(f))
  .forEach(f => { try { eval(fs.readFileSync(path.join(dir, 'data', f), 'utf8')); } catch (e) { } });
const ok = (c, m) => console.log((c ? '✔' : '✘ FAIL') + ' ' + m);

const all = [];
Object.keys(REGIONS).forEach(k => (REGIONS[k].pois || []).forEach(p => all.push({ r: k, p })));

// ── 있는가
ok(typeof REVIEWS === 'object', 'REVIEWS 데이터가 있다');
{
  const miss = all.filter(x => !REVIEWS[x.p.id]);
  ok(!miss.length, `장소 ${all.length}곳 전부 리뷰가 있다`
     + (miss.length ? ` — 빠짐: ${miss.slice(0, 3).map(x => x.p.name).join(', ')}` : ''));
  const bad = all.filter(x => (REVIEWS[x.p.id] || []).length !== 3);
  ok(!bad.length, '모두 3개씩'
     + (bad.length ? `: ${bad.slice(0, 3).map(x => x.p.name + '(' + REVIEWS[x.p.id].length + ')').join(', ')}` : ''));
  // 데이터에 없는 id 가 남아 있으면 장소를 지우고 리뷰를 안 지운 것이다
  const ids = new Set(all.map(x => x.p.id));
  const orphan = Object.keys(REVIEWS).filter(id => !ids.has(id));
  ok(!orphan.length, '없는 장소의 리뷰가 남아 있지 않다' + (orphan.length ? ': ' + orphan.slice(0, 3) : ''));
}

// ── 같은 장소 안에서 문장이 겹치지 않는가
{
  const dup = all.filter(x => new Set(REVIEWS[x.p.id]).size !== 3);
  ok(!dup.length, '한 장소 안에서 같은 말이 반복되지 않는다'
     + (dup.length ? ': ' + dup.slice(0, 3).map(x => x.p.name).join(', ') : ''));
}

// ── 내용이 장소와 맞는가. 안 맞으면 읽는 사람이 바로 알아챈다.
{
  const bad = [];
  all.forEach(({ p }) => {
    const rs = REVIEWS[p.id] || [];
    const t = rs.join(' ');
    // 짐 보관소에 관광지 말투가 붙으면 안 된다
    if (p.sub === 'locker' && /분위기|경치|다시 가고|둘러봅/.test(t)) bad.push(p.name + '(락커에 관광 말투)');
    // 숙소에 "두어 시간 잡아야" 같은 관람 시간 얘기가 붙으면 안 된다
    if (p.type === 'stay' && /두어 시간|둘러봅|오래 걸려요/.test(t)) bad.push(p.name + '(숙소에 관람 말투)');
    // 커피 얘기는 카페에만
    if (/커피 맛/.test(t) && p.sub !== 'cafe') bad.push(p.name + '(카페 아닌데 커피)');
    // 짐 맡기는 얘기는 보관소에만
    if (/짐 맡기고/.test(t) && p.sub !== 'locker') bad.push(p.name + '(보관소 아닌데 짐)');
  });
  ok(!bad.length, '장소 종류에 안 맞는 리뷰가 없다' + (bad.length ? ': ' + bad.slice(0, 4).join(', ') : ''));
}

// ── 규칙과 이어지는 말이 실제 조건에서만 나오는가
{
  const bad = [];
  Object.keys(REGIONS).forEach(k => {
    const R = REGIONS[k];
    const pos = (R.subway && R.subway.pos) || {};
    const RAD = 6371, rd = d => d * Math.PI / 180;
    const km = (a, b) => {
      const dl = rd(b[0] - a[0]), dg = rd(b[1] - a[1]);
      const h = Math.sin(dl / 2) ** 2 + Math.cos(rd(a[0])) * Math.cos(rd(b[0])) * Math.sin(dg / 2) ** 2;
      return 2 * RAD * Math.asin(Math.sqrt(h));
    };
    (R.pois || []).forEach(p => {
      const t = (REVIEWS[p.id] || []).join(' ');
      let near = Infinity;
      for (const s in pos) { const d = km([p.lat, p.lng], pos[s]); if (d < near) near = d; }
      // "역에서 바로" 는 정말 가까울 때만
      if (/역에서 바로|역 나오자마자|역이랑 붙어/.test(t) && near >= .4)
        bad.push(`${p.name}(역 ${near.toFixed(1)}km인데 "바로")`);
      // "역에서 멀다" 는 정말 멀 때만
      if (/역에서 꽤 걸어|가기엔 좀 멀어/.test(t) && near <= 2 && !(p.access >= 15))
        bad.push(`${p.name}(역 ${near.toFixed(1)}km인데 "멀다")`);
      // 휴무 얘기는 휴무가 있을 때만
      if (/쉬는 날/.test(t) && !(p.closed && p.closed.length))
        bad.push(`${p.name}(휴무 없는데 휴무 얘기)`);
    });
  });
  ok(!bad.length, '거리·휴무 얘기가 실제 데이터와 맞는다' + (bad.length ? ': ' + bad.slice(0, 4).join(', ') : ''));
}

// ── 읽기 전용이어야 한다. 점수·체력에 쓰이면 안 된다.
{
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const engine = html.slice(html.indexOf('const DETOUR'), html.indexOf('// 상태'));
  ok(!/REVIEWS/.test(engine), '엔진(compute·travel)이 리뷰를 참조하지 않는다 — 읽기 전용이다');
  ok(/reviewBlock\(id\)/.test(html), '팝업이 리뷰를 그린다');
}

// ── 길이. 팝업이 236px 이라 너무 길면 넘친다.
{
  const long = [];
  Object.values(REVIEWS).flat().forEach(t => { if (t.length > 42) long.push(t); });
  ok(!long.length, `한 줄이 42자 이하 (가장 긴 것 ${Math.max(...Object.values(REVIEWS).flat().map(t => t.length))}자)`
     + (long.length ? ': ' + long[0] : ''));
}
