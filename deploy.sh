#!/bin/bash

# Velora Jobs Deployment Script (VPS + Cloudflare WARP)
# Usage: ./deploy.sh

set -e

echo "🚀 Starting Velora Jobs Deployment..."

# 1. Install/Verify Cloudflare WARP (Optional but recommended for scraping)
if ! command -v warp-cli &> /dev/null; then
    echo "🌐 Installing Cloudflare WARP for safer scraping..."
    # Add cloudflare gpg key
    curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
    # Add repo
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list
    # Install
    sudo apt-get update && sudo apt-get install cloudflare-warp -y
    
    # Register (Free Mode)
    echo "🔐 Registering WARP..."
    warp-cli registration new
    warp-cli mode proxy
    warp-cli proxy port 40000
    warp-cli connect
    echo "✅ WARP installed and running on port 40000"
else
    echo "✅ Cloudflare WARP is already installed."
fi

# 2. Setup Production Environment
if [ ! -f backend/.env ]; then
    echo "⚠️  backend/.env not found! Copying from .env.prod.example..."
    cp .env.prod.example backend/.env
    echo "PLEASE EDIT backend/.env WITH REAL CREDENTIALS!"
    exit 1
fi

# 3. Build & Deploy Containers
echo "🐳 Building Docker Containers..."
docker compose build

echo "🚀 Launching Services..."
docker compose up -d

# 4. Database Migration
echo "📦 Running Database Migrations..."
echo "⏳ Waiting for database to be ready..."
until docker compose exec db pg_isready -U postgres; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

docker compose exec backend alembic upgrade head

echo "✅ Deployment Complete!"
echo "   - Frontend: http://localhost:3001"
echo "   - Backend: http://localhost:8001"
echo "   - WARP Proxy: socks5://localhost:40000 (Set this in backend/.env if needed)"
