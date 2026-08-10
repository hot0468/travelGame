// 전체 검증 러너: node tools/all.js
// 각 스위트의 ✔/✘ 를 세고, 실패가 있으면 해당 줄을 보여주고 종료코드 1.
const { spawnSync } = require('child_process');
const path = require('path');

const suites = ['selftest', 'stamtest', 'bufftest', 'subtest', 'dowtest', 'rettest', 'daytest', 'ruletest', 'subwaytest', 'transittest', 'balance'];
let fails = 0;

for (const name of suites) {
  // stdout·stderr 를 둘 다 봐야 한다. selftest·balance 는 실패를 console.error 로 내보내므로
  // stdout 만 읽으면 ✘ 가 집계에서 통째로 빠져 "전부 통과" 가 찍힌다.
  const r = spawnSync('node', [path.join(__dirname, name + '.js')], { encoding: 'utf8', timeout: 300000 });
  const out = (r.stdout || '') + (r.stderr || '') + (r.error ? r.error.message : '');
  const ok = (out.match(/✔/g) || []).length;
  const bad = (out.match(/✘/g) || []).length;
  // 스위트가 중간에 죽으면 ✘ 없이 ✔ 개수만 줄어 "전부 통과" 가 찍힌다.
  // 검사 실패는 ✘ 로 이미 잡히니, ✘ 가 없는데 비정상 종료면 그건 뻗은 것이다.
  // (ruletest 가 이렇게 22건을 조용히 잃은 적이 있다.)
  if (r.status !== 0 && !bad) {
    fails++;
    console.log(`${name.padEnd(9)} ✘ 비정상 종료(code ${r.status}) — 검사 ${ok}건만 돌았다`);
    console.log('  ' + (out.split('\n').find(l => /Error/.test(l)) || '').trim());
    continue;
  }
  fails += bad;
  console.log(`${name.padEnd(9)} ✔${ok}${bad ? `  ✘${bad}` : ''}`);
  if (bad) console.log(out.split('\n').filter(l => l.includes('✘')).map(l => '  ' + l).join('\n'));
}
console.log(fails ? `\n실패 ${fails}건` : '\n전부 통과');
process.exit(fails ? 1 : 0);
