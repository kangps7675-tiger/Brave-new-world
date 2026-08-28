# Upload ukraine PBF to R2 after local download completes, then delete local copy.
$ErrorActionPreference = "Stop"
$ROOT = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$envFile = Join-Path $ROOT ".env"
$LOG = Join-Path $PSScriptRoot "ukraine-queue.log"
$local = "C:\Users\kangp\Downloads\ukraine-260824.osm.pbf"
$expect = 874291400
$name = "ukraine-260824.osm.pbf"
$RCLONE = "C:\Users\kangp\AppData\Local\Microsoft\WinGet\Packages\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\rclone-v1.75.0-windows-amd64\rclone.exe"

function Log([string]$m) {
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "$ts $m"
  Write-Host $line
  Add-Content -Path $LOG -Value $line -ErrorAction SilentlyContinue
}

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

Log "ukraine-upload-wait: polling for complete local file..."
while ($true) {
  if (-not (Test-Path $local)) { Start-Sleep -Seconds 30; continue }
  $sz = (Get-Item -LiteralPath $local).Length
  Start-Sleep -Seconds 15
  $sz2 = (Get-Item -LiteralPath $local).Length
  if ($sz -ge $expect -and $sz -eq $sz2) { break }
  Log "ukraine-upload-wait: size=$sz expect=$expect"
  Start-Sleep -Seconds 30
}

Log "upload $name -> R2..."
& $RCLONE copy $local "r2:conflict-view-data/sources/osm-pbf/" `
  --s3-no-check-bucket --s3-upload-concurrency 8 --transfers 1 -P --retries 10 --low-level-retries 20
if ($LASTEXITCODE -ne 0) { Log "FAIL upload $name exit=$LASTEXITCODE"; exit 1 }
Remove-Item $local -Force
Log "ukraine upload done, local deleted"
Log "===== ukraine-queue done ====="
