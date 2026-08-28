@echo off
REM Detached R2 upload of all local OSM PBFs (survives Cursor shell).
set ROOT=%~dp0..\..
cd /d "%ROOT%"
set LOG=%~dp0upload-r2.log
echo ===== %DATE% %TIME% osm:pbf:sync start =====>> "%LOG%"
node scripts\osm-pbf\sync-r2.mjs >> "%LOG%" 2>&1
echo ===== %DATE% %TIME% osm:pbf:sync exit %ERRORLEVEL% =====>> "%LOG%"
