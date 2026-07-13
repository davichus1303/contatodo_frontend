#!/bin/sh
set -e

# Generate runtime environment configuration
cat > /usr/share/nginx/html/assets/env.js <<EOF
(function (window) {
    window['env'] = window['env'] || {};
    window['env'].BASE_URL = window['env'].BASE_URL || '${BACKEND_URL:-http://localhost:8080}';
    window['env'].SLASH = window['env'].SLASH || '/';
    window['env'].PRODUCTS = window['env'].PRODUCTS || 'products';
})(this);
EOF

echo "Generated env.js with BASE_URL: ${BACKEND_URL:-http://localhost:8080}"

# Start Nginx
exec nginx -g 'daemon off;'
