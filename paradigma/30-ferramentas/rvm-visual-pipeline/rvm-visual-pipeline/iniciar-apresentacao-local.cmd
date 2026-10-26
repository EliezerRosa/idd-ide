@echo off
setlocal
set PORT=5500
cd /d "%~dp0"
echo Iniciando servidor local em http://localhost:%PORT% ...
echo.
start "" "http://localhost:%PORT%/eleicao-candidatos-apresentacao-interativa.html"
py -m http.server %PORT% || python -m http.server %PORT%
endlocal
