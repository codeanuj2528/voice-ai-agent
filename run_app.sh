#!/bin/bash

# Function to kill all background processes on exit
cleanup() {
    echo "Stopping all services..."
    kill $(jobs -p)
    exit
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup SIGINT

echo "Starting Voice AI Agent locally..."

# Start Backend API
echo "Starting Backend API..."
cd server
# Check if virtual environment exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi
python3 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# Wait for Backend to start
echo "Waiting for Backend to initialize..."
sleep 5

# Start Backend Worker
echo "Starting Voice Agent Worker..."
python3 agent/voice_agent.py dev &
WORKER_PID=$!

# Start Frontend
echo "Starting Frontend..."
cd ../client
npm run dev -- --port 3000 &
FRONTEND_PID=$!

echo "All services started!"
echo "Backend API: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop."

# Wait for all processes
wait $BACKEND_PID $WORKER_PID $FRONTEND_PID
