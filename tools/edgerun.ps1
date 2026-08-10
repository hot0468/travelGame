# 헤드리스 Edge 실행 공용부. probe.ps1 · shot.ps1 이 점 소싱해서 쓴다.
# 왜 있나: -Wait 나 & 로 그냥 부르면 페이지가 안 끝날 때 Edge 가 영원히 남는다.
# 남은 것들이 쌓이면 커밋 메모리를 먹어 "페이징 파일이 너무 작습니다" 로 PC 전체가 멈춘다
# (실제로 34개가 쌓여 PowerShell 조차 못 뜬 적이 있다). 그래서 항상 제한 시간을 건다.

function Find-Edge {
  $p = @("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
         "C:\Program Files\Microsoft\Edge\Application\msedge.exe") |
       Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $p) { Write-Error "Edge 없음"; exit 1 }
  $p
}

# 앞선 실행에서 남은 헤드리스 Edge 만 정리한다. user-data-dir 이름(cc_edge_)으로 가려내므로
# 사용자가 직접 띄워 둔 브라우저 창은 건드리지 않는다.
function Stop-StrayEdge {
  Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*cc_edge_*' } |
    ForEach-Object { & taskkill /F /T /PID $_.ProcessId 2>&1 | Out-Null }
  Get-ChildItem $env:TEMP -Directory -Filter 'cc_edge_*' -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}

# Edge 를 띄우고 제한 시간 안에 안 끝나면 자식 렌더러까지 죽인다. 정상 종료면 $true.
function Invoke-Edge {
  param([string[]]$EdgeArgs, [string]$StdOut, [int]$TimeoutSec = 60)
  $sp = @{ FilePath = (Find-Edge); ArgumentList = $EdgeArgs; NoNewWindow = $true; PassThru = $true }
  if ($StdOut) { $sp.RedirectStandardOutput = $StdOut }
  $p = Start-Process @sp
  if ($p.WaitForExit($TimeoutSec * 1000)) { return $true }
  & taskkill /F /T /PID $p.Id 2>&1 | Out-Null
  return $false
}
