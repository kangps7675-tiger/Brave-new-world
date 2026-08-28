# One-shot: upload completed russia PBF to R2 and delete local copy.
$ErrorActionPreference = "Stop"
$ROOT = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$envFile = Join-Path $ROOT ".env"
$RCLONE = "C:\Users\kangp\AppData\Local\Microsoft\WinGet\Packages\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\rclone-v1.75.0-windows-amd64\rclone.exe"
$local = "C:\Users\kangp\Downloads\russia-260825.osm.pbf"

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

Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') upload russia -> R2..."
& $RCLONE copy $local "r2:conflict-view-data/sources/osm-pbf/" `
  --s3-no-check-bucket --s3-upload-concurrency 8 --transfers 1 -P --retries 10 --low-level-retries 20
if ($LASTEXITCODE -ne 0) { throw "russia upload failed exit=$LASTEXITCODE" }
Remove-Item $local -Force
Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') russia upload done, local deleted"
