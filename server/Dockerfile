# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies (python/make/g++ needed for some native modules like bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build/test if needed)
RUN npm ci

# Copy source code
COPY . .

# Prune dev dependencies to keep image small
RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine

WORKDIR /usr/src/app

# Install runtime dependencies (tini for signal handling)
RUN apk add --no-cache tini

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy allowed packet files
COPY package*.json ./

# Copy built node_modules from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy source code
COPY --from=builder /usr/src/app .

# Set strict permissions
RUN chown -R nodejs:nodejs /usr/src/app

# Switch to non-root user
USER nodejs

# Environemnt Variables (Defaults)
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Use Tini as init
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "app.js"]
