@echo off
echo Iniciando Backend y Frontend...
echo.

echo [1/6] Verificando base de datos...
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

echo [2/6] Creando backup de la base de datos...
cd backend
call npm.cmd exec ts-node scripts/backup-db.ts
cd ..

echo [3/6] Verificando datos de seed...
cd backend
rem call npm.cmd exec ts-node scripts/seed.ts
call npm.cmd exec ts-node scripts/seed-admin.ts
cd ..

echo [4/6] Iniciando Backend (NestJS) en puerto 3000...
start cmd /c "cd backend && npm.cmd start"
timeout /t 5 /nobreak >nul

echo [5/6] Iniciando Frontend (Next.js) en puerto 3001...
start cmd /c "cd frontend && npm.cmd run dev"

echo [6/6] Esperando...
timeout /t 3 /nobreak >nul

echo.
echo ====================================
echo Servidores iniciados!
echo ====================================
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:3001
echo.
pause