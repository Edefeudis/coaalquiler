@echo off
echo ====================================
echo Deteniendo CoaAlquiler - Frontend y Backend
echo ====================================
echo.

echo Buscando procesos de Node.js...
tasklist /FI "IMAGENAME eq node.exe" /FO TABLE | find /I "node.exe"

echo.
echo Terminando procesos de Node.js...
taskkill /F /IM node.exe >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [OK] Procesos de Node.js terminados exitosamente
) else (
    echo [INFO] No se encontraron procesos de Node.js activos
)

echo.
echo ====================================
echo Aplicacion detenida!
echo ====================================
echo.
pause
