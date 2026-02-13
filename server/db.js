import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration - PRODUCTION OPTIMIZED
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10) || 3306,

  // Date handling
  dateStrings: true,

  // Connection pool settings - CRITICAL for 100k+ users
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE, 10) || 100, // 🔥 Increased from 10
  queueLimit: 500, // Queue requests when pool exhausted
  acquireTimeout: 30000, // 30s timeout to acquire connection
  
  // Connection health
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10s keepalive
  
  // Timeouts
  connectTimeout: 10000, // 10s to establish connection
  
  // Query defaults
  multipleStatements: false, // Security: prevent SQL injection chains
  namedPlaceholders: true, // Enable named placeholders for safety
};

// Create connection pool
const db = mysql.createPool(dbConfig);

// Test database connection and log status
const testConnection = async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ Database connected successfully');
    console.log(`📊 Host: ${dbConfig.host}`);
    console.log(`📦 Database: ${dbConfig.database}`);
    console.log(`🔌 Port: ${dbConfig.port}`);
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Please check your database configuration in .env file');
  }
};

// Execute connection test
testConnection();

// Handle pool errors
db.on('error', (err) => {
  console.error('Database pool error:', err);
});

export default db;
