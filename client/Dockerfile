# Stage 1: Build React App
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build assets (dist folder)
ENV VITE_API_URL=/api
RUN npm run build

# Stage 2: Serve with Nginx for production
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy build artifacts to nginx html
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/defaul.conf

# Create a non-root user (good practice, but nginx:nginx user exists) OR use nginx default user/group.
# Standard nginx image runs as root, then switches to nginx user for worker processes.
# For maximum security, we can run as non-root entirely if needed, but standard nginx image is usually fine if we don't bind <1024.
# We'll use default nginx user but configure listening port > 1024

RUN sed -i 's/listen       80;/listen       8080;/g' /etc/nginx/conf.d/defaul.conf && \
  sed -i 's/user  nginx;/#user  nginx;/g' /etc/nginx/nginx.conf && \
  chown -R nginx:nginx /usr/share/nginx/html && chmod -R 755 /usr/share/nginx/html && \
  chown -R nginx:nginx /var/cache/nginx && \
  chown -R nginx:nginx /var/log/nginx && \
  chown -R nginx:nginx /etc/nginx/conf.d && \
  touch /var/run/nginx.pid && \
  chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -I -f http://localhost:8080 || exit 1

CMD ["nginx", "-g", "daemon off;"]
