# Wait until no python extract.py is running, then start Asia pipeline.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path (Join-Path $Root "scripts\crink-infra\run.mjs"))) {
  $Root = $PSScriptRoot + "\..\.."
  $Root = (Resolve-Path $Root).Path
}
Set-Location $Root
$Work = Join-Path $Root "scripts\crink-infra\work"
New-Item -ItemType Directory -Force -Path $Work | Out-Null
$Log = Join-Path $Work "asia-extract.out.log"
$PidFile = Join-Path $Work "asia-wait.pid"
$PID | Set-Content $PidFile

function ExtractRunning {
  $n = @(Get-CimInstance Win32_Process | Where-Object {
    $_.Name -match "python|py.exe" -and $_.CommandLine -match "extract\.py"
  }).Count
  return $n -gt 0
}

Add-Content -Encoding utf8 $Log "[$(Get-Date -Format o)] waiting for russia extract.py to finish before asia"
while (ExtractRunning) {
  Add-Content -Encoding utf8 $Log "[$(Get-Date -Format o)] russia still running — retry in 90s"
  Start-Sleep -Seconds 90
}

Add-Content -Encoding utf8 $Log "[$(Get-Date -Format o)] starting asia extract"
& node "scripts\crink-infra\run.mjs" --only=asia *>> $Log
$exit = $LASTEXITCODE
Add-Content -Encoding utf8 $Log "[$(Get-Date -Format o)] asia pipeline exit=$exit"
if ($exit -ne 0) { exit $exit }
