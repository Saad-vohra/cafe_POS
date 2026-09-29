#!/bin/bash

echo "======================================"
echo " Smart Restaurant Management System"
echo "======================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js v16+ from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Check MongoDB
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB not found locally. Make sure MongoDB is running or update .env with Atlas URI"
else
    echo "✅ MongoDB found"
fi

echo ""
echo "📦 Installing dependencies..."
cd backend && npm install --silent
[ -f .env ] || cp .env.example .env
cd ../frontend && npm install --silent
[ -f .env ] || cp .env.example .env
cd ..

echo ""
echo "🚀 Starting application..."
echo "   Backend:  http://localhost:5000"
echo "   Frontend: http://localhost:3000"
echo ""
echo "👉 First time running? Open http://localhost:3000/register to create your restaurant account."
echo ""

# Start backend
cd backend && node server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
cd ../frontend && npm start &
FRONTEND_PID=$!

echo "✅ Application started!"
echo "   Press Ctrl+C to stop"

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
