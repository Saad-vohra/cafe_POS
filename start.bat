@echo off
echo ======================================
echo  Smart Restaurant Management System
echo ======================================
echo.

echo Installing backend dependencies...
cd backend
call npm install
if not exist .env copy .env.example .env
cd ..

echo.
echo Installing frontend dependencies...
cd frontend
call npm install
if not exist .env copy .env.example .env
cd ..

echo.
echo Starting backend server...
start "SRMS Backend" cmd /k "cd backend && node server.js"

timeout /t 3 /nobreak > nul

echo Starting frontend...
start "SRMS Frontend" cmd /k "cd frontend && npm start"

echo.
echo ======================================
echo  Application is starting...
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:3000
echo.
echo  Login credentials:
echo  First time? Open http://localhost:3000/register to create your restaurant account.
echo ======================================
pause
