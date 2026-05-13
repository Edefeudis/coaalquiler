@echo off
echo ====================================
echo Reiniciando CoaAlquiler - Frontend y Backend
echo ====================================
echo.

echo [1/5] Deteniendo procesos actuales...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/5] Verificando base de datos...
cd backend
if not exist "prisma\dev.db" (
    if not exist "prisma\prisma\dev.db" (
        echo Base de datos no encontrada. Generando cliente y creando BD...
        call npm.cmd run prisma:generate
        call npm.cmd run prisma:push
        echo Base de datos creada.
    ) else (
        echo Base de datos encontrada en prisma\prisma\.
    )
) else (
    echo Base de datos encontrada.
)

echo [3/5] Verificando datos de seed...
call npm.cmd exec ts-node scripts/seed-admin.ts
cd ..

echo [4/5] Iniciando Backend (NestJS) en puerto 3000...
start "Backend - NestJS (Puerto 3000)" cmd /c "cd backend && npm.cmd start"

timeout /t 3 /nobreak >nul

echo [5/5] Iniciando Frontend (Next.js) en puerto 3001...
start "Frontend - Next.js (Puerto 3001)" cmd /c "cd frontend && npm.cmd run dev"

echo.
echo ====================================
echo Aplicacion reiniciada!
echo ====================================
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:3001
echo.
pause
