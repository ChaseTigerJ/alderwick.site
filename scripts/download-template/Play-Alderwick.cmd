@echo off
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  py -3 launch.py
  if not errorlevel 1 exit /b
)
where python >nul 2>nul
if not errorlevel 1 (
  python launch.py
  if not errorlevel 1 exit /b
)
where node >nul 2>nul
if not errorlevel 1 (
  node launch.mjs
  if not errorlevel 1 exit /b
)
echo.
echo Alderwick needs Python 3 or Node.js to start the local game server.
echo Install one, then run this launcher again. See READ-ME-FIRST.txt.
pause
