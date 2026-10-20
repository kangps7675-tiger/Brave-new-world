@echo off
REM Detached Russia extract only — Asia is run separately.
set ROOT=%~dp0..\..
cd /d "%ROOT%"
set LOG=%~dp0overnight.log
echo ===== %DATE% %TIME% russia start =====>> "%LOG%"
node scripts\crink-infra\run.mjs --only=russia >> "%LOG%" 2>&1
if errorlevel 1 (
  echo ===== %DATE% %TIME% russia FAILED =====>> "%LOG%"
  exit /b 1
)
echo ===== %DATE% %TIME% russia done (asia skipped) =====>> "%LOG%"
