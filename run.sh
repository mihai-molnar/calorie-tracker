#!/bin/bash
trap 'kill 0' EXIT

cd "$(dirname "$0")"

echo "Starting backend..."
cd backend && uvicorn app.main:app --reload --port 8000 &

echo "Starting frontend..."
cd frontend && yarn dev &

wait
