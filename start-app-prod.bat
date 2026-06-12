@echo off
chcp 65001 >nul
title CoaAlquiler - Inicio Produccion
setlocal enabledelayedexpansion

echo ====================================
echo Iniciando CoaAlquiler - MODO PRODUCCION
echo ====================================
echo.
echo Este script compila todo el frontend UNA SOLA VEZ
echo y luego lo sirve sin recompilar en cada acceso.
echo.

:: Colores usando ANSI escape codes en Windows 10+
set "GREEN=[92m"
set "YELLOW=[93m"
set "CYAN=[96m"
set "RESET=[0m"

echo %CYAN%[1/6]%RESET% Verificando base de datos...
if not exist "prisma\dev.db" (
    if not exist "prisma\prisma\dev.db" (
        echo %YELLOW%Base de datos no encontrada. Generando cliente y creando BD...%RESET%
        call npm.cmd run prisma:generate
        call npm.cmd run prisma:push
        echo %GREEN%Base de datos creada.%RESET%
    ) else (
        echo %GREEN%Base de datos encontrada en prisma\prisma\.%RESET%
    )
) else (
    echo %GREEN%Base de datos encontrada.%RESET%
)

echo %CYAN%[2/6]%RESET% Creando backup de la base de datos...
cd backend
call npm.cmd exec ts-node scripts/backup-db.ts
cd ..
echo %GREEN%Backup creado.%RESET%

echo %CYAN%[3/6]%RESET% Verificando datos de seed...
cd backend
call npm.cmd exec ts-node scripts/seed-admin.ts
cd ..
echo %GREEN%Seed verificado.%RESET%

echo %CYAN%[4/6]%RESET% COMPILANDO FRONTEND (esto tomara unos segundos)...
cd frontend
echo Ejecutando: npm run build
call npm.cmd run build
if %ERRORLEVEL% NEQ 0 (
    echo [91mERROR: La compilacion del frontend fallo![0m
    echo Revisa los errores arriba.
    pause
    exit /b 1
)
echo %GREEN%Frontend compilado exitosamente!%RESET%
cd ..

echo %CYAN%[5/6]%RESET% Iniciando Backend (NestJS) en puerto 3000...
start "Backend - NestJS (Puerto 3000)" cmd /c "cd backend && npm.cmd start"

timeout /t 3 /nobreak >nul

echo %CYAN%[6/6]%RESET% Iniciando Frontend (Next.js - MODO PRODUCCION) en puerto 3001...
:: IMPORTANTE: next start usa los archivos pre-compilados de .next/
:: No recompila nada en tiempo real. Todo quedo compilado en el paso 4.
start "Frontend - Next.js (Puerto 3001) - MODO PRODUCCION" cmd /c "cd frontend && npm.cmd start"

echo.
echo ====================================
echo %GREEN%Aplicacion iniciada en MODO PRODUCCION!%RESET%
echo ====================================
echo %CYAN%Backend:%RESET%  http://localhost:3000
echo %CYAN%Frontend:%RESET% http://localhost:3001
echo.
echo %YELLOW%DIFERENCIAS CLAVE CON MODO DESARROLLO:%RESET%
echo - Todo el frontend ya esta compilado (paso 4)
echo - No se recompila nada al navegar entre paginas
echo - Las paginas cargan INSTANTANEAMENTE
echo - No hay hot-reload (necesitas reiniciar si cambias codigo)
echo.
echo Para detener: cierra las ventanas o ejecuta stop-app.bat
echo.
pause