#!/usr/bin/env sh
set -eu

BUNDLE_DIR="${1:?Bundle directory is required}"
APP_DIR="${2:-/opt/contatodo-web}"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"

mkdir -p "$APP_DIR"

cp "$BUNDLE_DIR/deploy/docker-compose.ec2.yml" "$COMPOSE_FILE"

cd "$APP_DIR"

# Create network if it doesn't exist
docker network create contatodo-network 2>/dev/null || true

docker compose -f "$COMPOSE_FILE" pull
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
docker image prune -af

rm -rf "$BUNDLE_DIR"
