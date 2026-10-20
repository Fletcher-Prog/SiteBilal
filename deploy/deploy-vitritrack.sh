#!/bin/bash
set -euo pipefail

APP_DIR="/root/VitriTrack"
COMPOSE_DIR="$APP_DIR/deploy/docker"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=== VitriTrack Deploy — $TIMESTAMP ==="

# 1. Extract archive from stdin to temp dir
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT
tar xzf - -C "$TEMP_DIR"

# 2. Rsync to app directory (preserve .env and data volume)
mkdir -p "$APP_DIR"
rsync -a --delete \
  --exclude='deploy/docker/.env' \
  --exclude='data/' \
  "$TEMP_DIR/" "$APP_DIR/"

# 3. Ensure .env exists
if [ ! -f "$COMPOSE_DIR/.env" ]; then
  echo "JWT_SECRET=$(openssl rand -hex 32)" > "$COMPOSE_DIR/.env"
  echo "⚠️  Created default .env — update JWT_SECRET if needed"
fi

# 4. Build and restart
cd "$COMPOSE_DIR"
docker compose up -d --build --remove-orphans

echo "✅ VitriTrack deployed successfully"
