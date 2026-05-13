@echo off
cd /d c:\EDU\backend
npx prisma generate --schema prisma\schema.prisma
echo Prisma client generated
pause
