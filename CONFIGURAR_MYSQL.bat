@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Instala Node.js 24 LTS con npm y vuelve a abrir este archivo.
  pause
  exit /b 1
)
node configurar-mysql.mjs
if errorlevel 1 (
  echo.
  echo No se pudo configurar MySQL. Revisa el mensaje anterior.
  pause
  exit /b 1
)
echo.
echo Configuracion terminada. Puedes abrir INICIAR.bat.
pause
