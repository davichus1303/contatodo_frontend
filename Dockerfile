# ==========================
# Stage 1 - Build Angular
# ==========================
FROM node:22-bookworm AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the project
COPY . .

# Build application for production
RUN npm run build

# ==========================
# Stage 2 - Nginx
# ==========================
FROM nginx:1.28-bookworm

# Remove default Nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled application
COPY --from=build /app/dist/contatodo_web/browser /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]