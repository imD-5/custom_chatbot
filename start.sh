#!/bin/bash

# Start backend
cd backend
source venv/bin/activate
python app.py &
BACKEND_PID=$!

# Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Function to kill processes on script exit
cleanup() {
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit
}

trap cleanup INT

# Wait for processes
wait
