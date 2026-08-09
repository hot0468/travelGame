# 헤드리스 프로브: _cal.html 을 렌더해 document.title 의 PROBE JSON 을 UTF-8 로 출력.
#   주입 코드에서 document.title='PROBE '+JSON.stringify({...}) 로 값을 내보내는 패턴과 짝.
#   powershell -NoProfile -File tools/probe.ps1 [-Page _cal.html] [-Budget 5000]
# dump-dom 의 stdout 은 중첩 셸에서 유실되므로 Start-Process 파일 리다이렉트로 받는다.
param(
  [string]$Page = '_cal.html',
  [int]$Budget = 5000
)
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$root = Split-Path -Parent $PSScriptRoot
$edge = @("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
          "C:\Program Files\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Error "Edge 없음"; exit 1 }
$url = "file:///" + ($root -replace '\\','/') + "/$Page"
$tmp = Join-Path $env:TEMP ("probe_" + [guid]::NewGuid().ToString('N') + ".html")
$p = Start-Process -FilePath $edge -ArgumentList @('--headless','--disable-gpu','--dump-dom','--window-size=1600,1000',"--virtual-time-budget=$Budget",$url) `
     -RedirectStandardOutput $tmp -RedirectStandardError ($tmp + '.err') -NoNewWindow -PassThru -Wait
$dom = Get-Content $tmp -Raw -Encoding UTF8
Remove-Item $tmp, ($tmp + '.err') -Force -ErrorAction SilentlyContinue
$m = [regex]::Match($dom, '<title>(PROBE [^<]*)</title>')
if ($m.Success) { $m.Groups[1].Value } else { Write-Error "PROBE 제목 없음 — 주입 코드에서 document.title 설정 확인"; exit 1 }
