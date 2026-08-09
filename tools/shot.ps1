# 헤드리스 Edge 스크린샷.
#   powershell -NoProfile -File tools/shot.ps1                        # _cal.html → _shot.png
#   powershell -NoProfile -File tools/shot.ps1 -Out x.png -W 1400 -H 900 -Scale 2
param(
  [string]$Page = '_cal.html',
  [string]$Out = '_shot.png',
  [int]$W = 1600,
  [int]$H = 1000,
  [int]$Scale = 1,
  [int]$Budget = 4000
)
$root = Split-Path -Parent $PSScriptRoot
$edge = @("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
          "C:\Program Files\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Error "Edge 없음"; exit 1 }
$url = "file:///" + ($root -replace '\\','/') + "/$Page"
$outPath = Join-Path $root $Out
$udd = Join-Path $env:TEMP ('cc_edge_' + [guid]::NewGuid().ToString('N'))
$extra = @()
if ($Scale -gt 1) { $extra += "--force-device-scale-factor=$Scale" }
& $edge --headless --disable-gpu "--user-data-dir=$udd" --no-first-run "--screenshot=$outPath" "--window-size=$W,$H" "--virtual-time-budget=$Budget" @extra $url 2>$null | Out-Null
Remove-Item $udd -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path $outPath) { "저장: $outPath ($([math]::Round((Get-Item $outPath).Length/1KB))KB)" } else { Write-Error "실패"; exit 1 }
