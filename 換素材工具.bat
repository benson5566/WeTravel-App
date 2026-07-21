@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js not found. Install the LTS version from https://nodejs.org
  echo     then double-click this file again.
  pause
  exit /b 1
)
if not exist "tools\node_modules" (
  echo [1/2] First run: installing dependencies... about 1 minute, once only.
  pushd tools
  call npm.cmd install
  if errorlevel 1 (
    echo [X] Install failed. Read the messages above for the reason.
    popd
    pause
    exit /b 1
  )
  popd
)
echo [2/2] Starting the asset tool. Your browser should open by itself.
echo       If it does not, copy the http://localhost address printed below
echo       into Chrome or Edge. Close this window to stop the tool.
node tools\gui.mjs
pause
