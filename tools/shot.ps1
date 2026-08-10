# 헤드리스 Edge 스크린샷.
#   powershell -NoProfile -File tools/shot.ps1                        # _cal.html → _shot.png
#   powershell -NoProfile -File tools/shot.ps1 -Out x.png -W 1400 -H 900 -Scale 2
param(
  [string]$Page = '_cal.html',
  [string]$Out = '_shot.png',
  [int]$W = 1600,
  [int]$H = 1000,
  [int]$Scale = 1,
  [int]$Budget = 4000,
  [int]$TimeoutSec = 60
)
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'edgerun.ps1')
Stop-StrayEdge
$url = "file:///" + ($root -replace '\\','/') + "/$Page"
$outPath = Join-Path $root $Out
$udd = Join-Path $env:TEMP ('cc_edge_' + [guid]::NewGuid().ToString('N'))
$extra = @()
if ($Scale -gt 1) { $extra += "--force-device-scale-factor=$Scale" }
$done = Invoke-Edge -EdgeArgs (@('--headless','--disable-gpu',"--user-data-dir=$udd",'--no-first-run',
  "--screenshot=$outPath","--window-size=$W,$H","--virtual-time-budget=$Budget") + $extra + $url) -TimeoutSec $TimeoutSec
if (-not $done) { Write-Warning "Edge 가 ${TimeoutSec}초 안에 안 끝나 강제 종료했다" }
Remove-Item $udd -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path $outPath) { "저장: $outPath ($([math]::Round((Get-Item $outPath).Length/1KB))KB)" } else { Write-Error "실패"; exit 1 }
