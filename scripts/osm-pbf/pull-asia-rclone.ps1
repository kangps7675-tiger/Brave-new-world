# Pull asia PBF from R2 via rclone (resumable). Then run rail/road extract.
# Usage: pwsh scripts/osm-pbf/pull-asia-rclone.ps1

$ErrorActionPreference = "Continue"
$ROOT = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $ROOT "package.json"))) {
  $ROOT = "c:\Users\kangp\OneDrive\Desktop\Confilct-view-dev\Confilct-view-dev"
}
Set-Location $ROOT

$envFile = Join-Path $ROOT ".env"
$Log = Join-Path $ROOT "scripts\crink-infra\work\asia-rclone.log"
$DestDir = Join-Path $ROOT "data\sources\osm-pbf"
$Name = "asia-260825.osm.pbf"
$Dest = Join-Path $DestDir $Name
$Expected = [int64]16208931364
$env:PYTHONUNBUFFERED = "1"

function Write-Log([string]$msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
  try { Add-Content -Path $Log -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue } catch {}
  Write-Host $line
}

function Find-Rclone {
  $candidates = @(
    "$env:LOCALAPPDATA\Microsoft\WinGet\Links\rclone.exe",
    (Get-Command rclone -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)
  )
  foreach ($p in $candidates) {
    if ($p -and (Test-Path $p)) { return $p }
  }
  $found = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Rclone*" -Recurse -Filter rclone.exe -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) { return $found.FullName }
  throw "rclone not found — install: winget install Rclone.Rclone"
}

function Load-R2Env {
  if (-not (Test-Path $envFile)) { throw "Missing $envFile" }
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^(R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY|R2_ACCOUNT_ID)=(.+)$') {
      Set-Item -Path "env:$($matches[1])" -Value $matches[2].Trim()
    }
  }
  if (-not $env:R2_ACCOUNT_ID -or -not $env:R2_ACCESS_KEY_ID -or -not $env:R2_SECRET_ACCESS_KEY) {
    throw "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY required in .env"
  }
  $env:RCLONE_CONFIG_R2_TYPE = "s3"
  $env:RCLONE_CONFIG_R2_PROVIDER = "Cloudflare"
  $env:RCLONE_CONFIG_R2_ACCESS_KEY_ID = $env:R2_ACCESS_KEY_ID
  $env:RCLONE_CONFIG_R2_SECRET_ACCESS_KEY = $env:R2_SECRET_ACCESS_KEY
  $env:RCLONE_CONFIG_R2_ENDPOINT = "https://$($env:R2_ACCOUNT_ID).r2.cloudflarestorage.com"
  $env:RCLONE_CONFIG_R2_ACL = "private"
}

function Test-AsiaReady {
  if (-not (Test-Path $Dest)) { return $false }
  $sz = (Get-Item $Dest).Length
  return ([Math]::Abs($sz - $Expected) -le ($Expected * 0.02))
}

function Stop-WranglerAsiaPull {
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'wrangler.*asia-260825|osm:pbf:pull.*asia|sync-r2\.mjs --pull.*asia' } |
    ForEach-Object {
      Write-Log "stopping wrangler/npm pull PID $($_.ProcessId)"
      try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
    }
  # Also stop old watch that may wipe partial + re-pull with wrangler
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'run-asia-watch-detached' } |
    ForEach-Object {
      Write-Log "stopping old watch PID $($_.ProcessId)"
      try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
    }
  Start-Sleep -Seconds 2
}

$RCLONE = Find-Rclone
Load-R2Env
New-Item -ItemType Directory -Force -Path $DestDir | Out-Null

Write-Log "asia rclone pull start (rclone=$RCLONE)"
Stop-WranglerAsiaPull

if (Test-AsiaReady) {
  Write-Log ("asia PBF already complete: {0:N2} GB" -f ((Get-Item $Dest).Length / 1GB))
} else {
  if (Test-Path $Dest) {
    Write-Log ("resuming from partial {0:N2} GB" -f ((Get-Item $Dest).Length / 1GB))
  }
  $remote = "r2:conflict-view-data/sources/osm-pbf/$Name"
  # --s3-no-check-bucket: R2 often rejects HeadBucket
  # retries + low-level retries for flaky links; continue partial
  & $RCLONE copy $remote $DestDir `
    --s3-no-check-bucket `
    --retries 20 `
    --low-level-retries 20 `
    --retries-sleep 15s `
    --stats 30s `
    --stats-one-line `
    --log-file $Log `
    --log-level INFO
  if ($LASTEXITCODE -ne 0) {
    Write-Log "rclone copy FAILED exit=$LASTEXITCODE"
    exit $LASTEXITCODE
  }
  if (-not (Test-AsiaReady)) {
    $sz = if (Test-Path $Dest) { (Get-Item $Dest).Length } else { 0 }
    Write-Log ("size mismatch after rclone: {0:N2} GB expected ~16.21 GB" -f ($sz / 1GB))
    exit 2
  }
  Write-Log ("asia PBF ready: {0:N2} GB" -f ((Get-Item $Dest).Length / 1GB))
}

Write-Log "extracting rail/road for asia..."
& npm run crink:infra:extract:transport -- --only=asia *>> $Log
if ($LASTEXITCODE -ne 0) {
  Write-Log "asia extract FAILED exit=$LASTEXITCODE"
  exit $LASTEXITCODE
}
Write-Log "asia-transport done"
exit 0
