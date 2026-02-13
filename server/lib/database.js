/**
 * Production-grade Database Connection Pool
 * Features:
 * - Connection pooling optimized for high traffic
 * - Query timeout enforcement
 * - Retry logic with exponential backoff
 * - Connection health monitoring
 * - Graceful shutdown support
 */

import mysql from 'mysql2/promise';
import config from '../config/index.js';
import logger from '../lib/logger.js';

const dbConfig = {
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  port: config.database.port,
  
  // Pool configuration for high traffic
  waitForConnections: config.database.pool.waitForConnections,
  connectionLimit: config.database.pool.connectionLimit,
  queueLimit: config.database.pool.queueLimit,
  enableKeepAlive: config.database.pool.enableKeepAlive,
  keepAliveInitialDelay: config.database.pool.keepAliveInitialDelay,
  
  // Additional settings
  dateStrings: config.database.dateStrings,
  connectTimeout: config.database.pool.acquireTimeout,
  
  // Timezone handling
  timezone: '+00:00',
  
  // Better error handling
  multipleStatements: false,
};

// Create the connection pool
const pool = mysql.createPool(dbConfig);

// Pool statistics for monitoring
let poolStats = {
  queriesExecuted: 0,
  queriesFailed: 0,
  connectionErrors: 0,
  lastHealthCheck: null,
  isHealthy: false,
};

/**
 * Execute query with timeout and retry logic
 */
export const query = async (sql, params = [], options = {}) => {
  const startTime = Date.now();
  const timeout = options.timeout || config.database.queryTimeout;
  const maxRetries = options.retries || 0;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Query timeout after ${timeout}ms`));
        }, timeout);
      });
      
      // Execute query with timeout
      const queryPromise = pool.execute(sql, params);
      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      const duration = Date.now() - startTime;
      poolStats.queriesExecuted++;
      
      // Log slow queries
      if (duration > 1000) {
        logger.warn('Slow query detected', {
          sql: sql.substring(0, 200),
          duration,
          threshold: 1000,
        });
      }
      
      logger.query(sql, duration);
      
      return result;
    } catch (error) {
      lastError = error;
      poolStats.queriesFailed++;
      
      // Determine if error is retryable
      const isRetryable = [
        'ETIMEDOUT',
        'ECONNRESET',
        'ENOTFOUND',
        'PROTOCOL_CONNECTION_LOST',
        'ER_LOCK_DEADLOCK',
        'ER_LOCK_WAIT_TIMEOUT',
      ].includes(error.code);
      
      if (isRetryable && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        logger.warn('Retrying query', {
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: error.message,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
};

/**
 * Execute query within a transaction
 */
export const transaction = async (callback) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Health check for database connection
 */
export const healthCheck = async () => {
  try {
    const startTime = Date.now();
    const [rows] = await pool.execute('SELECT 1 as health');
    const duration = Date.now() - startTime;
    
    poolStats.lastHealthCheck = new Date().toISOString();
    poolStats.isHealthy = true;
    
    return {
      healthy: true,
      latency: duration,
      timestamp: poolStats.lastHealthCheck,
    };
  } catch (error) {
    poolStats.isHealthy = false;
    poolStats.connectionErrors++;
    
    logger.error('Database health check failed', { error: error.message });
    
    return {
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Get pool statistics
 */
export const getPoolStats = () => {
  return {
    ...poolStats,
    poolSize: pool.pool?._allConnections?.length || 0,
    freeConnections: pool.pool?._freeConnections?.length || 0,
    pendingRequests: pool.pool?._connectionQueue?.length || 0,
  };
};

/**
 * Graceful shutdown - close all connections
 */
export const shutdown = async () => {
  logger.info('Closing database connections...');
  
  try {
    await pool.end();
    logger.info('Database connections closed successfully');
  } catch (error) {
    logger.error('Error closing database connections', { error: error.message });
    throw error;
  }
};

/**
 * Initialize database connection and verify
 */
export const initialize = async () => {
  try {
    const health = await healthCheck();
    
    if (health.healthy) {
      logger.info('Database connection established', {
        host: config.database.host,
        database: config.database.name,
        port: config.database.port,
        poolSize: config.database.pool.connectionLimit,
        latency: health.latency,
      });
    } else {
      throw new Error('Database health check failed');
    }
    
    return health;
  } catch (error) {
    logger.error('Failed to initialize database', { error: error.message });
    throw error;
  }
};

// Default export for backward compatibility
export default {
  query: (sql, params) => query(sql, params),
  execute: (sql, params) => query(sql, params),
  getConnection: () => pool.getConnection(),
  transaction,
  healthCheck,
  getPoolStats,
  shutdown,
  initialize,
  pool,
};
