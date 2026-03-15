#!/bin/bash
set -e

APP_DIR="/opt/calorie-tracker"

echo "=== Calorie Tracker Deployment ==="

# Install nginx if needed
if ! command -v nginx &> /dev/null; then
    echo "Installing nginx..."
    sudo apt update && sudo apt install -y nginx
fi

# Create app directory
sudo mkdir -p "$APP_DIR"
sudo chown -R clawd:clawd "$APP_DIR"

# Clone or pull repo
if [ -d "$APP_DIR/.git" ]; then
    echo "Pulling latest changes..."
    cd "$APP_DIR" && git pull
else
    echo "Cloning repo..."
    git clone https://github.com/mihai-molnar/calorie-tracker.git "$APP_DIR"
fi

cd "$APP_DIR"

# --- Backend setup ---
echo "Setting up backend..."
cd "$APP_DIR/backend"

# Create venv if needed
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt
deactivate

# Check for .env
if [ ! -f ".env" ]; then
    echo ""
    echo "!!! IMPORTANT: Create backend/.env with your credentials !!!"
    echo "Copy from .env.example and fill in real values:"
    echo "  cp $APP_DIR/backend/.env.example $APP_DIR/backend/.env"
    echo "  nano $APP_DIR/backend/.env"
    echo ""
fi

# --- Frontend setup ---
echo "Setting up frontend..."
cd "$APP_DIR/frontend"

npm install --legacy-peer-deps

# Check for .env
if [ ! -f ".env" ]; then
    echo ""
    echo "!!! IMPORTANT: Create frontend/.env with your credentials !!!"
    echo "  cp $APP_DIR/frontend/.env.example $APP_DIR/frontend/.env"
    echo "  nano $APP_DIR/frontend/.env"
    echo ""
    echo "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
    echo "After creating .env, re-run this script to build the frontend."
    echo ""
else
    npm run build
fi

# --- Nginx setup ---
echo "Configuring nginx..."
sudo cp "$APP_DIR/deploy/calorie-tracker.nginx" /etc/nginx/sites-available/calorie-tracker
sudo ln -sf /etc/nginx/sites-available/calorie-tracker /etc/nginx/sites-enabled/calorie-tracker
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx && sudo systemctl enable nginx

# --- Systemd service ---
echo "Setting up backend service..."
sudo cp "$APP_DIR/deploy/calorie-tracker.service" /etc/systemd/system/calorie-tracker.service
sudo systemctl daemon-reload
sudo systemctl restart calorie-tracker
sudo systemctl enable calorie-tracker

echo ""
echo "=== Deployment complete ==="
echo "App is running at: http://89.167.66.135"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status calorie-tracker   # backend status"
echo "  sudo journalctl -u calorie-tracker -f    # backend logs"
echo "  sudo systemctl restart calorie-tracker   # restart backend"
echo "  sudo systemctl restart nginx             # restart nginx"
