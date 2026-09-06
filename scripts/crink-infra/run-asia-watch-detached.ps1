# Detached from Cursor agent shells — survives chat/task aborts.
$ErrorActionPreference = "Continue"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $Root "package.json"))) {
  $Root = "c:\Users\kangp\OneDrive\Desktop\Confilct-view-dev\Confilct-view-dev"
}
Set-Location $Root
$Log = Join-Path $Root "scripts\crink-infra\work\asia-watch.log"
$AsiaPbf = Join-Path $Root "data\sources\osm-pbf\asia-260825.osm.pbf"
$Expected = [int64]16208931364
$env:PYTHONUNBUFFERED = "1"

function Write-Log([string]$msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
  try { Add-Content -Path $Log -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue } catch {}
  Write-Host $line
}

function Get-PullCount {
  @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'wrangler.*asia-260825|sync-r2.*asia|osm:pbf:pull.*asia' }).Count
}

function Test-AsiaReady {
  if (-not (Test-Path $AsiaPbf)) { return $false }
  $sz = (Get-Item $AsiaPbf).Length
  return ([Math]::Abs($sz - $Expected) -le ($Expected * 0.02))
}

Write-Log "asia-watch-detached: start (pid=$PID)"
while ($true) {
  $n = Get-PullCount
  $sz = if (Test-Path $AsiaPbf) { (Get-Item $AsiaPbf).Length } else { 0 }
  Write-Log ("pullProcs={0} size={1:N2} GB ({2:N1}%)" -f $n, ($sz / 1GB), (100.0 * $sz / $Expected))
  if ((Test-AsiaReady) -and $n -eq 0) { break }
  if ($n -eq 0 -and -not (Test-AsiaReady)) {
    # Only wipe partial if it looks stalled (no write for 10+ min) — never delete a growing file.
    $stale = $true
    if (Test-Path $AsiaPbf) {
      $ageMin = ((Get-Date) - (Get-Item $AsiaPbf).LastWriteTime).TotalMinutes
      if ($ageMin -lt 10) {
        Write-Log ("partial still fresh ({0:N1} min) — wait, do not wipe" -f $ageMin)
        $stale = $false
      }
    }
    if (-not $stale) { Start-Sleep -Seconds 180; continue }

    Write-Log "pull died incomplete — restarting with retries"
    $ok = $false
    for ($i = 1; $i -le 5; $i++) {
      Write-Log "pull attempt $i/5"
      if (Test-Path $AsiaPbf) { Remove-Item -Force $AsiaPbf }
      & npm run osm:pbf:pull -- --only=asia-260825.osm.pbf *>> $Log
      if ($LASTEXITCODE -eq 0 -and (Test-AsiaReady)) { $ok = $true; break }
      Write-Log "pull FAILED — sleep 30s"
      Start-Sleep -Seconds 30
    }
    if (-not $ok) { Write-Log "pull exhausted"; exit 1 }
    break
  }
  Start-Sleep -Seconds 180
}

Write-Log ("PBF ready {0:N2} GB — extract asia rail/road" -f ((Get-Item $AsiaPbf).Length / 1GB))
& npm run crink:infra:extract:transport -- --only=asia *>> $Log
if ($LASTEXITCODE -ne 0) {
  Write-Log "extract FAILED exit=$LASTEXITCODE"
  exit $LASTEXITCODE
}
Write-Log "asia-transport done"
exit 0
