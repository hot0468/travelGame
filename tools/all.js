// 전체 검증 러너: node tools/all.js
// 각 스위트의 ✔/✘ 를 세고, 실패가 있으면 해당 줄을 보여주고 종료코드 1.
const { execFileSync } = require('child_process');
const path = require('path');

const suites = ['selftest', 'stamtest', 'bufftest', 'subtest', 'dowtest', 'rettest', 'daytest', 'balance'];
let fails = 0;

for (const name of suites) {
  let out;
  try {
    out = execFileSync('node', [path.join(__dirname, name + '.js')], { encoding: 'utf8', timeout: 120000 });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || e.message);
  }
  const ok = (out.match(/✔/g) || []).length;
  const bad = (out.match(/✘/g) || []).length;
  fails += bad;
  console.log(`${name.padEnd(9)} ✔${ok}${bad ? `  ✘${bad}` : ''}`);
  if (bad) console.log(out.split('\n').filter(l => l.includes('✘')).map(l => '  ' + l).join('\n'));
}
console.log(fails ? `\n실패 ${fails}건` : '\n전부 통과');
process.exit(fails ? 1 : 0);
