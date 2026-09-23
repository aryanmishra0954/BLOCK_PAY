#!/bin/bash
set -e

echo "=========================================="
echo "?? Deploying BlockPay Production Stack"
echo "=========================================="

if ! command -v docker &> /dev/null; then
    echo "[!] Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

if [ ! -f .env ]; then
    echo "[*] Creating .env from .env.docker.example..."
    cp .env.docker.example .env
fi

echo "[*] Building and starting BlockPay services (Frontend, Backend, PostgreSQL)..."
docker compose down || true
docker compose up -d --build

echo ""
echo "=========================================="
echo "? BlockPay Successfully Deployed!"
echo "=========================================="
echo "• Frontend:    http://$(curl -s ifconfig.me 2>/dev/null || echo localhost)"
echo "• Backend API: http://$(curl -s ifconfig.me 2>/dev/null || echo localhost):3000/health"
echo "• Database:    PostgreSQL 16 running on port 5432"
echo "=========================================="
