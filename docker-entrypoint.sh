#!/bin/sh
set -e

echo "Starting entrypoint script..."
echo "BACKEND_URL: ${BACKEND_URL:-not set}"

# Generate runtime environment configuration
ENV_FILE="/usr/share/nginx/html/assets/env.js"
echo "Generating env.js at: $ENV_FILE"

cat > "$ENV_FILE" <<EOF
(function (window) {
    window['env'] = window['env'] || {};
    window['env'].BASE_URL = window['env'].BASE_URL || '${BACKEND_URL:-http://localhost:8080}';
    window['env'].SLASH = window['env'].SLASH || '/';
    window['env'].PRODUCTS = window['env'].PRODUCTS || 'products';
})(this);
EOF

echo "Generated env.js with BASE_URL: ${BACKEND_URL:-http://localhost:8080}"
echo "File contents:"
cat "$ENV_FILE"

# Start Nginx
echo "Starting Nginx..."
exec nginx -g 'daemon off;'
