# Wait until extract.py is gone, then pull full asia PBF and extract rail/road.
$ErrorActionPreference = "Continue"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $Root "package.json"))) {
  $Root = "c:\Users\kangp\OneDrive\Desktop\Confilct-view-dev\Confilct-view-dev"
}
Set-Location $Root
$Log = Join-Path $Root "scripts\crink-infra\work\asia-transport.out.log"
$AsiaPbf = Join-Path $Root "data\sources\osm-pbf\asia-260825.osm.pbf"
$Expected = [int64]16208931364
$env:PYTHONUNBUFFERED = "1"

function Write-Log([string]$msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
  Add-Content -Path $Log -Value $line -Encoding UTF8
  Write-Host $line
}

Write-Log "asia-transport wait start (root=$Root)"

while ($true) {
  $n = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'extract\.py' }).Count
  Write-Log "extract.py processes: $n"
  if ($n -eq 0) { break }
  Start-Sleep -Seconds 90
}

Write-Log "no extract.py — preparing asia PBF"

if (Test-Path $AsiaPbf) {
  $sz = (Get-Item $AsiaPbf).Length
  if ([Math]::Abs($sz - $Expected) -gt ($Expected * 0.02)) {
    Write-Log ("removing partial asia PBF: {0:N2} GB" -f ($sz / 1GB))
    Remove-Item -Force $AsiaPbf
  } else {
    Write-Log "asia PBF size OK — skip re-pull"
  }
}

if (-not (Test-Path $AsiaPbf)) {
  Write-Log "pulling asia-260825.osm.pbf from R2 (~16GB)..."
  & npm run osm:pbf:pull -- --only=asia-260825.osm.pbf *>> $Log
  if ($LASTEXITCODE -ne 0) {
    Write-Log "PBF pull FAILED (exit $LASTEXITCODE)"
    exit 1
  }
}

if (-not (Test-Path $AsiaPbf)) {
  Write-Log "asia PBF still missing after pull"
  exit 1
}
$sz = (Get-Item $AsiaPbf).Length
Write-Log ("asia PBF size: {0:N2} GB" -f ($sz / 1GB))
if ([Math]::Abs($sz - $Expected) -gt ($Expected * 0.02)) {
  Write-Log "size mismatch — abort"
  exit 2
}

Write-Log "extracting rail/road for asia (hours)..."
& npm run crink:infra:extract:transport -- --only=asia *>> $Log
if ($LASTEXITCODE -ne 0) {
  Write-Log "asia extract FAILED (exit $LASTEXITCODE)"
  exit $LASTEXITCODE
}

Write-Log "asia-transport done"
