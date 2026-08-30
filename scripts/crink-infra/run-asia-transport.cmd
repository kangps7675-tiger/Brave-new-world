@echo off
REM Wait for the russia/cuba/venezuela transport extract to finish, then:
REM   1) replace the partial asia PBF (~2.5GB) with a full R2 pull (~16.2GB)
REM   2) extract rail/road for asia only (clip + merge + snap via run.mjs)
REM
REM Safe to start while remaining-transport is still running — this script polls
REM until extract.py is gone before doing anything heavy.

set ROOT=%~dp0..\..
cd /d "%ROOT%"
set LOG=%~dp0work\asia-transport.out.log
set PYTHONUNBUFFERED=1
set EXPECTED_BYTES=16208931364
set ASIA_PBF=data\sources\osm-pbf\asia-260825.osm.pbf

echo.
echo [asia-transport] waiting for other extract.py to finish...
echo [asia-transport] log: %LOG%
echo ===== %DATE% %TIME% asia-transport wait start =====>> "%LOG%"

:wait_extract
powershell -NoProfile -Command ^
  "$n = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match 'extract\\.py' }).Count;" ^
  "Write-Host ('[asia-transport] extract.py processes: ' + $n);" ^
  "if ($n -gt 0) { exit 1 } else { exit 0 }"
if errorlevel 1 (
  timeout /t 90 /nobreak >nul
  goto wait_extract
)

echo [asia-transport] no extract.py — starting asia pull + extract
echo ===== %DATE% %TIME% asia-transport extract start =====>> "%LOG%"

REM Drop partial / wrong-sized asia PBF so wrangler can re-download cleanly
if exist "%ASIA_PBF%" (
  powershell -NoProfile -Command ^
    "$p='%ASIA_PBF%'; $sz=(Get-Item $p).Length; $exp=[int64]%EXPECTED_BYTES%;" ^
    "if ([Math]::Abs($sz - $exp) -gt ($exp * 0.02)) {" ^
    "  Write-Host ('[asia-transport] removing partial asia PBF: {0:N2} GB (expected {1:N2} GB)' -f ($sz/1GB), ($exp/1GB));" ^
    "  Remove-Item -Force $p;" ^
    "} else { Write-Host '[asia-transport] asia PBF size OK — skip re-pull' }"
)

if not exist "%ASIA_PBF%" (
  echo [asia-transport] pulling asia-260825.osm.pbf from R2 (~16GB)...
  call npm run osm:pbf:pull -- --only=asia-260825.osm.pbf >> "%LOG%" 2>&1
  if errorlevel 1 (
    echo [asia-transport] PBF pull FAILED
    echo ===== %DATE% %TIME% asia pull FAILED =====>> "%LOG%"
    pause
    exit /b 1
  )
)

powershell -NoProfile -Command ^
  "$p='%ASIA_PBF%'; if (-not (Test-Path $p)) { Write-Host 'missing asia pbf'; exit 1 };" ^
  "$sz=(Get-Item $p).Length; $exp=[int64]%EXPECTED_BYTES%;" ^
  "Write-Host ('[asia-transport] asia PBF size: {0:N2} GB' -f ($sz/1GB));" ^
  "if ([Math]::Abs($sz - $exp) -gt ($exp * 0.02)) { Write-Host 'size mismatch — abort'; exit 2 }; exit 0"
if errorlevel 1 (
  echo [asia-transport] asia PBF size check FAILED — see %LOG%
  pause
  exit /b 1
)

echo [asia-transport] extracting rail/road for asia (hours)...
powershell -NoProfile -Command ^
  "$env:PYTHONUNBUFFERED='1';" ^
  "npm run crink:infra:extract:transport -- --only=asia 2>&1" ^
  "| Tee-Object -FilePath '%LOG%' -Append; exit $LASTEXITCODE"

if errorlevel 1 (
  echo [asia-transport] FAILED — see %LOG%
  echo ===== %DATE% %TIME% asia-transport FAILED =====>> "%LOG%"
  pause
  exit /b 1
)

echo.
echo [asia-transport] done
echo ===== %DATE% %TIME% asia-transport done =====>> "%LOG%"
pause
