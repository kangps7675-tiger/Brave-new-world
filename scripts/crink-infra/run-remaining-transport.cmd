@echo off
REM russia rail/road extract only (belarus/ukraine already done), then merge + snap.
REM cuba/venezuela intentionally excluded — not part of CRINK Eurasian corridor mesh.
REM asia: run-asia-transport.ps1 waits for this, then pull+extract asia.

set ROOT=%~dp0..\..
cd /d "%ROOT%"
set LOG=%~dp0work\remaining-transport.out.log
set PYTHONUNBUFFERED=1

echo.
echo [crink-infra] remaining transport extract: russia only
echo [crink-infra] (skip cuba/venezuela — outside CRINK Eurasian mesh)
echo [crink-infra] log file: %LOG%
echo.

echo ===== %DATE% %TIME% remaining-transport start (russia) =====>> "%LOG%"

powershell -NoProfile -Command ^
  "$env:PYTHONUNBUFFERED='1';" ^
  "npm run crink:infra:extract:transport -- --only=russia 2>&1" ^
  "| Tee-Object -FilePath '%LOG%' -Append; exit $LASTEXITCODE"

if errorlevel 1 (
  echo.
  echo [crink-infra] FAILED — see %LOG%
  echo ===== %DATE% %TIME% remaining-transport FAILED =====>> "%LOG%"
  pause
  exit /b 1
)

echo.
echo [crink-infra] russia done — asia follows via run-asia-transport.ps1
echo ===== %DATE% %TIME% remaining-transport done =====>> "%LOG%"
pause
