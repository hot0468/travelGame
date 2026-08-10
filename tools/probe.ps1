# 헤드리스 프로브: _cal.html 을 렌더해 document.title 의 PROBE JSON 을 UTF-8 로 출력.
#   주입 코드에서 document.title='PROBE '+JSON.stringify({...}) 로 값을 내보내는 패턴과 짝.
#   powershell -NoProfile -File tools/probe.ps1 [-Page _cal.html] [-Budget 5000]
#
# 함정 세 가지:
#  - dump-dom 의 stdout 은 중첩 셸에서 유실되므로 파일 리다이렉트로 받는다.
#  - 사용자가 띄운 Edge 와 프로필이 겹치면 헤드리스가 조용히 죽는다 → 매번 전용 user-data-dir.
#  - 그래도 stdout 이 간헐적으로 비어 나와 최대 3회 재시도한다.
param(
  [string]$Page = '_cal.html',
  [int]$Budget = 5000,
  [int]$Tries = 3,
  [int]$TimeoutSec = 60,
  [int]$W = 1600,                   # 반응형 확인은 -W 390 -H 844 처럼 창 크기를 지정한다
  [int]$H = 1000
)
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'edgerun.ps1')
Stop-StrayEdge                     # 앞 실행이 남긴 헤드리스 Edge 를 먼저 치운다
$url = "file:///" + ($root -replace '\\','/') + "/$Page"

for ($i = 1; $i -le $Tries; $i++) {
  $udd = Join-Path $env:TEMP ('cc_edge_' + [guid]::NewGuid().ToString('N'))
  $tmp = Join-Path $env:TEMP ('probe_' + [guid]::NewGuid().ToString('N') + '.html')
  $done = Invoke-Edge -EdgeArgs @(
      '--headless','--disable-gpu',"--user-data-dir=$udd",'--no-first-run','--disable-extensions',
      '--dump-dom',"--window-size=$W,$H","--virtual-time-budget=$Budget",$url
    ) -StdOut $tmp -TimeoutSec $TimeoutSec
  if (-not $done) { Write-Warning "Edge 가 ${TimeoutSec}초 안에 안 끝나 강제 종료했다 (시도 $i/$Tries)" }
  $dom = if (Test-Path $tmp) { Get-Content $tmp -Raw -Encoding UTF8 } else { '' }
  if ($null -eq $dom) { $dom = '' }
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  Remove-Item $udd -Recurse -Force -ErrorAction SilentlyContinue

  $m = [regex]::Match($dom, '<title>(PROBE [^<]*)</title>')
  if ($m.Success) { $m.Groups[1].Value; exit 0 }
  if ($dom.Length -gt 0) {
    # 페이지는 떴는데 제목이 없다 = 주입 코드가 실행 중 예외로 죽었을 가능성
    Write-Error "PROBE 제목 없음 (DOM $($dom.Length)자). 주입 코드에서 예외가 났는지 확인"
    exit 1
  }
  Start-Sleep -Milliseconds 400
}
Write-Error "헤드리스 출력이 $Tries 회 모두 비었음"
exit 1
