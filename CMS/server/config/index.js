/**
 * Centralized Configuration Management
 * Production-grade configuration with validation and defaults
 */

import dotenv from 'dotenv';

dotenv.config();

// Environment validation
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];

const validateEnv = () => {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Only validate in production
if (process.env.NODE_ENV === 'production') {
  validateEnv();
}

const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 5000,
    env: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    host: process.env.HOST || '0.0.0.0',
    shutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT, 10) || 30000,
  },

  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'cms',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    
    // Connection Pool Settings (Optimized for high traffic)
    pool: {
      connectionLimit: parseInt(process.env.DB_POOL_SIZE, 10) || 100,
      queueLimit: parseInt(process.env.DB_QUEUE_LIMIT, 10) || 0,
      acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT, 10) || 30000,
      waitForConnections: true,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    },
    
    // Query Settings
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT, 10) || 30000,
    dateStrings: true,
    
    // Retry Settings
    retry: {
      maxRetries: parseInt(process.env.DB_MAX_RETRIES, 10) || 5,
      retryDelay: parseInt(process.env.DB_RETRY_DELAY, 10) || 1000,
    },
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000, // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    skipSuccessfulRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
  },

  // CORS Configuration
  cors: {
    origins: process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',') 
      : ['http://localhost:5000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:80'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Correlation-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400, // 24 hours
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: process.env.LOG_FORMAT || 'json',
    includeTimestamp: true,
    includeRequestId: true,
  },

  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    helmet: {
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    },
  },

  // Health Check Configuration
  health: {
    path: '/health',
    readyPath: '/ready',
    livePath: '/live',
  },

  // Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    uploadDir: process.env.UPLOAD_DIR || './uploads',
  },
};

// Freeze configuration to prevent runtime modifications
Object.freeze(config);
Object.freeze(config.server);
Object.freeze(config.database);
Object.freeze(config.database.pool);
Object.freeze(config.database.retry);
Object.freeze(config.jwt);
Object.freeze(config.rateLimit);
Object.freeze(config.cors);
Object.freeze(config.logging);
Object.freeze(config.security);
Object.freeze(config.health);
Object.freeze(config.upload);

export default config;
