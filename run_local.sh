#!/bin/bash

# Local development script without Docker

echo "Starting DreamForge locally without Docker..."

# Check if PostgreSQL and Redis are installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL is not installed. Please install it first:"
    echo "  brew install postgresql"
    exit 1
fi

if ! command -v redis-server &> /dev/null; then
    echo "Redis is not installed. Please install it first:"
    echo "  brew install redis"
    exit 1
fi

# Start Redis in background
echo "Starting Redis..."
redis-server --daemonize yes

# Start PostgreSQL if not running
echo "Checking PostgreSQL..."
if ! pg_isready; then
    echo "Starting PostgreSQL..."
    brew services start postgresql
fi

# Create database if it doesn't exist
echo "Setting up database..."
createdb dreamforge 2>/dev/null || echo "Database already exists"

# Backend setup
echo "Setting up backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/bin/activate
pip install -r requirements.txt

# Initialize database
python -c "from database import init_db; init_db()" 2>/dev/null || echo "Database already initialized"

# Start backend in background
echo "Starting backend API..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Frontend setup
echo "Setting up frontend..."
cd ../dreamforge-app

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    npm install
fi

# Start frontend
echo "Starting frontend..."
npm run dev &
FRONTEND_PID=$!

echo "=================================="
echo "DreamForge is starting up!"
echo "=================================="
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo "=================================="

# Wait for interrupt
trap "echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID; redis-cli shutdown; exit" INT
wait