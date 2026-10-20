# Upload Geofabrik OSM PBF files to Cloudflare R2 via rclone (multipart S3).
# Reads R2_* from repo .env. Files >300 MiB cannot use wrangler object put.
#
# Usage:
#   pwsh scripts/osm-pbf/upload-r2-rclone.ps1
#   pwsh scripts/osm-pbf/upload-r2-rclone.ps1 -Only asia-260825.osm.pbf
#   pwsh scripts/osm-pbf/upload-r2-rclone.ps1 -SkipDownload   # local files only

param(
  [string[]]$Only = @(),
  [switch]$SkipDownload
)

$ErrorActionPreference = "Stop"
$ROOT = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$envFile = Join-Path $ROOT ".env"
$LOG = Join-Path $PSScriptRoot "upload-r2.log"
$DL = if ($env:OSM_PBF_DIR) { $env:OSM_PBF_DIR } else { "C:\Users\kangp\Downloads" }

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

function Log([string]$m) {
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "$ts $m"
  Write-Host $line
  Add-Content -Path $LOG -Value $line -ErrorAction SilentlyContinue
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

$RCLONE = Find-Rclone
Load-R2Env

$all = @(
  @{ name = "belarus-260824.osm.pbf"; url = "https://download.geofabrik.de/europe/belarus-260824.osm.pbf"; expect = 348272962; dl = $true },
  @{ name = "ukraine-260824.osm.pbf"; url = "https://download.geofabrik.de/europe/ukraine-260824.osm.pbf"; expect = 874291400; dl = $true },
  @{ name = "russia-260825.osm.pbf"; url = "https://download.geofabrik.de/russia-260825.osm.pbf"; expect = 4148075434; dl = $true },
  @{ name = "asia-260825.osm.pbf"; url = $null; expect = 16208931364; dl = $false }
)

if ($Only.Count -gt 0) {
  $want = [System.Collections.Generic.HashSet[string]]::new([string[]]$Only)
  $all = $all | Where-Object { $want.Contains($_.name) }
}

Log "===== upload-r2-rclone start ====="

foreach ($f in $all) {
  $existing = & $RCLONE ls "r2:conflict-view-data/sources/osm-pbf/$($f.name)" --s3-no-check-bucket 2>$null
  if ($existing) {
    Log "skip $($f.name) already on R2: $existing"
    continue
  }

  $local = Join-Path $DL $f.name
  if ($f.dl -and -not $SkipDownload) {
    if (-not (Test-Path $local) -or (Get-Item $local).Length -ne $f.expect) {
      if (Test-Path $local) { Remove-Item $local -Force }
      Log "download $($f.name) from Geofabrik..."
      curl.exe -L -A "Mozilla/5.0" --retry 5 --retry-delay 10 -o $local $f.url
      if ($LASTEXITCODE -ne 0) { Log "FAIL download $($f.name)"; continue }
      Log "downloaded $($f.name) bytes=$((Get-Item $local).Length)"
    }
  } elseif (-not (Test-Path $local)) {
    Log "SKIP missing local $($f.name)"
    continue
  }

  Log "upload $($f.name) -> r2:conflict-view-data/sources/osm-pbf/"
  & $RCLONE copy $local "r2:conflict-view-data/sources/osm-pbf/" `
    --s3-no-check-bucket --s3-upload-concurrency 8 --transfers 1 -P
  if ($LASTEXITCODE -ne 0) { Log "FAIL upload $($f.name) exit=$LASTEXITCODE"; continue }

  $head = & $RCLONE ls "r2:conflict-view-data/sources/osm-pbf/$($f.name)" --s3-no-check-bucket
  Log "verified R2: $head"

  if ($f.dl) {
    Remove-Item $local -Force
    Log "deleted local $($f.name)"
  }
}

Log "===== upload-r2-rclone done ====="
