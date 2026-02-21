// ==========================================
// src/db.ts - Drizzle Database Setup with Enhanced Connection Pooling
// ==========================================

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import { config } from './config/env';
import logger from './utils/logger';
import * as schema from './db/schema';

/**
 * Enhanced PostgreSQL connection pool configuration
 * Optimized for production with proper resource management
 */
const poolConfig: PoolConfig = {
  // Connection string from environment
  connectionString: config.database.url,

  // SSL configuration (required for Supabase)
  ssl: config.database.url.includes('supabase.com')
    ? { rejectUnauthorized: false }
    : config.nodeEnv === 'production'
      ? { rejectUnauthorized: false }
      : false,

  // Connection Pool Settings
  max: 20, // Maximum number of clients in the pool
  min: 2, // Minimum number of clients in the pool (keep connections warm)

  // Timeout Settings
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Wait 10 seconds before timing out when connecting

  // Query Settings
  statement_timeout: 30000, // Abort any statement that takes more than 30 seconds
  query_timeout: 30000, // Maximum query execution time

  // Application Name (helps with monitoring in pg_stat_activity)
  application_name: 'colmena-api',

  // Connection Options
  allowExitOnIdle: false, // Keep the pool running even if all clients are idle
};

// Create PostgreSQL connection pool
const pool = new Pool(poolConfig);

// Pool event handlers for monitoring and debugging
pool.on('connect', (client) => {
  logger.debug('New database client connected');
});

pool.on('acquire', (client) => {
  logger.debug('Client acquired from pool');
});

pool.on('remove', (client) => {
  logger.debug('Client removed from pool');
});

pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle database client:', err);
});

// Drizzle database instance
export const db = drizzle(pool, { schema });

// Export schema for use in queries
export { schema };

/**
 * Initialize database connection
 * Verifies connection and logs pool statistics
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    // Log connection info
    logger.info('✅ Database connected successfully (Drizzle + PostgreSQL)');
    logger.info(`📊 Pool configuration: max=${poolConfig.max}, min=${poolConfig.min}`);
    logger.info(`⏱️  Timeouts: idle=${poolConfig.idleTimeoutMillis}ms, connection=${poolConfig.connectionTimeoutMillis}ms`);

    // Extract and log host info (safely)
    const hostInfo = config.database.url.split('@')[1]?.split('/')[0];
    if (hostInfo) {
      logger.info(`🔗 Connected to: ${hostInfo}`);
    }
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
}

/**
 * Get current pool statistics
 * Useful for monitoring and debugging
 */
export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

/**
 * Close database connection pool gracefully
 * Should be called during application shutdown
 */
export async function closeDatabase(): Promise<void> {
  try {
    logger.info('🔌 Closing database connection pool...');

    // Get final stats before closing
    const stats = getPoolStats();
    logger.info(`📊 Pool stats at shutdown - Total: ${stats.total}, Idle: ${stats.idle}, Waiting: ${stats.waiting}`);

    await pool.end();
    logger.info('✅ Database connection pool closed successfully');
  } catch (error) {
    logger.error('❌ Error closing database connection pool:', error);
    throw error;
  }
}
