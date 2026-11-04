@echo off
cd /d "%~dp0tienda"
if not exist node_modules (
  echo Primero ejecuta npm ci dentro de la carpeta tienda.
  pause
  exit /b 1
)
call npm start
pause
