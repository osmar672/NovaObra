@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Instala Node.js 24 LTS desde https://nodejs.org y vuelve a abrir este archivo.
  pause
  exit /b 1
)
node iniciar.mjs
if errorlevel 1 (
  echo.
  echo No se pudo iniciar NovaObra. Revisa el mensaje anterior.
  pause
  exit /b 1
)
