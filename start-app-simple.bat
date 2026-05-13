@echo off
echo Iniciando Backend y Frontend...
echo.

echo [1/5] Verificando base de datos...
if not exist "backend\prisma\dev.db" (
    echo Base de datos no encontrada. Creando...
    cd backend
    call npm.cmd run prisma:generate
    call npm.cmd run prisma:push
    cd ..
    echo Base de datos creada.
) else (
    echo Base de datos encontrada.
)

echo [2/5] Verificando datos de seed...
cd backend
rem call npm.cmd exec ts-node scripts/seed.ts
call npm.cmd exec ts-node scripts/seed-admin.ts
cd ..

echo [3/5] Iniciando Backend (NestJS) en puerto 3000...
start cmd /c "cd backend && npm.cmd start"
timeout /t 5 /nobreak >nul

echo [4/5] Iniciando Frontend (Next.js) en puerto 3001...
start cmd /c "cd frontend && npm.cmd run dev"

echo [5/5] Esperando...
timeout /t 3 /nobreak >nul

echo.
echo ====================================
echo Servidores iniciados!
echo ====================================
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:3001
echo.
pause
