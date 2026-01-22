// ==========================================
// src/db/index.ts - Drizzle Database Setup con DATABASE_URL
// ==========================================

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from './env';
import logger from '../utils/logger';

// PostgreSQL connection pool usando DATABASE_URL
const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Aumentado para conexiones remotas
});

// Drizzle database instance
export const db = drizzle(pool);

/**
 * Initialize database connection
 * Verifica la conexión haciendo un SELECT 1
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    logger.info(
      '✅ Database connected successfully (Drizzle + Supabase PostgreSQL)'
    );
    logger.info(
      `📊 Connected to: ${config.database.url.split('@')[1].split('/')[0]}`
    );
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  try {
    await pool.end();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database:', error);
    throw error;
  }
}
