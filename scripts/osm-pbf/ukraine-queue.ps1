# Wait for russia download/upload to free disk, then fresh-download ukraine and upload to R2.
# Does NOT touch asia/russia/belarus jobs already running.

$ErrorActionPreference = "Stop"
$ROOT = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$envFile = Join-Path $ROOT ".env"
$LOG = Join-Path $PSScriptRoot "ukraine-queue.log"
$DL = if ($env:OSM_PBF_DIR) { $env:OSM_PBF_DIR } else { "C:\Users\kangp\Downloads" }

$name = "ukraine-260824.osm.pbf"
$url = "https://download.geofabrik.de/europe/ukraine-260824.osm.pbf"
$expect = 874291400
$russiaName = "russia-260825.osm.pbf"
$russiaExpect = [int64]4148075434
$needFreeBytes = [int64](900MB)

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
  throw "rclone not found"
}

function Log([string]$m) {
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "$ts $m"
  Write-Host $line
  Add-Content -Path $LOG -Value $line -ErrorAction SilentlyContinue
}

function Get-FreeBytes {
  $out = python -c "import shutil; print(shutil.disk_usage('C:/').free)" 2>$null
  if ($out) { return [int64]$out.Trim() }
  return (Get-PSDrive C).Free
}

function Load-R2Env {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^(R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY|R2_ACCOUNT_ID)=(.+)$') {
      Set-Item -Path "env:$($matches[1])" -Value $matches[2].Trim()
    }
  }
  $env:RCLONE_CONFIG_R2_TYPE = "s3"
  $env:RCLONE_CONFIG_R2_PROVIDER = "Cloudflare"
  $env:RCLONE_CONFIG_R2_ACCESS_KEY_ID = $env:R2_ACCESS_KEY_ID
  $env:RCLONE_CONFIG_R2_SECRET_ACCESS_KEY = $env:R2_SECRET_ACCESS_KEY
  $env:RCLONE_CONFIG_R2_ENDPOINT = "https://$($env:R2_ACCOUNT_ID).r2.cloudflarestorage.com"
  $env:RCLONE_CONFIG_R2_ACL = "private"
}

function Invoke-RcloneLs([string]$RemotePath) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  try {
    return (& $RCLONE ls $RemotePath --s3-no-check-bucket --log-level ERROR 2>&1 |
      Where-Object { $_ -is [string] }) -join "`n"
  } finally {
    $ErrorActionPreference = $prev
  }
}

$RCLONE = Find-Rclone
Load-R2Env

Log "===== ukraine-queue start (wait for russia + disk) ====="

$russiaPath = Join-Path $DL $russiaName
# russia upload handled by russia-upload-once.ps1 — poll until local file removed

while ($true) {
  $free = Get-FreeBytes
  $russiaExists = Test-Path $russiaPath
  $curlCount = @(Get-Process curl -ErrorAction SilentlyContinue).Count
  Log ("poll free={0:N2}GB russiaLocal={1} curlProcs={2}" -f ($free / 1GB), $russiaExists, $curlCount)
  if (-not $russiaExists -and $free -ge $needFreeBytes) { break }
  if (-not $russiaExists -and $curlCount -eq 0 -and $free -ge ([int64](800MB))) { break }
  Start-Sleep -Seconds 60
}

Log "ready — skip R2 pre-check (proceed if local missing)"
$local = Join-Path $DL $name
if (Test-Path $local) { Remove-Item $local -Force; Log "removed stale local $name" }

Log "download $name (fresh, Mozilla UA, no resume)..."
curl.exe -L -A "Mozilla/5.0" --ssl-no-revoke --retry 5 --retry-delay 10 -o $local $url
if ($LASTEXITCODE -ne 0) { Log "FAIL download $name exit=$LASTEXITCODE"; exit 1 }

$bytes = (Get-Item $local).Length
Log "downloaded $name bytes=$bytes"
if ($bytes -ne $expect) { Log "WARN size mismatch expect=$expect got=$bytes" }

Log "upload $name -> r2:conflict-view-data/sources/osm-pbf/"
& $RCLONE copy $local "r2:conflict-view-data/sources/osm-pbf/" `
  --s3-no-check-bucket --s3-upload-concurrency 8 --transfers 1 -P --retries 10 --low-level-retries 20
if ($LASTEXITCODE -ne 0) { Log "FAIL upload exit=$LASTEXITCODE"; exit 1 }

$head = Invoke-RcloneLs "r2:conflict-view-data/sources/osm-pbf/$name"
Log "verified R2: $head"
Remove-Item $local -Force
Log "deleted local $name"
Log "===== ukraine-queue done ====="
