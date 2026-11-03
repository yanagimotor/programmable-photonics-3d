@echo off
rem "Software written with light" (programmable photonics, interactive 3D): start a local server and open the page in Microsoft Edge.
rem (Browsers refuse to run the page's JavaScript modules straight from a file, so a tiny local server is used.)
setlocal
set PORT=8139
set "PY="
py -3 -c "import sys" >nul 2>nul && set "PY=py -3"
if not defined PY python -c "import sys" >nul 2>nul && set "PY=python"
if not defined PY python3 -c "import sys" >nul 2>nul && set "PY=python3"
if not defined PY (
  echo This page needs Python 3 for a small local web server.
  echo Install it from https://www.python.org/downloads/ and double-click this file again.
  pause
  exit /b 1
)
start "Page server (close this window to stop)" /min %PY% "%~dp0serve.py" "%~dp0docs" %PORT%
set /a TRIES=0
:wait
curl -s -o nul "http://127.0.0.1:%PORT%/" && goto open
set /a TRIES+=1
if %TRIES% geq 20 goto open
timeout /t 1 /nobreak >nul
goto wait
:open
start "" msedge "http://127.0.0.1:%PORT%/"
