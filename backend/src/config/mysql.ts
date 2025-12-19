/**
 * MySQL Database Configuration
 * For Donation & Charity Management Portal
 */

import mysql from 'mysql2/promise';

// MySQL Configuration
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3307'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'donation_charity',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
};

// Create connection pool
let pool: mysql.Pool | null = null;

/**
 * Initialize MySQL connection pool
 */
export const initMySQL = async (): Promise<void> => {
  try {
    pool = mysql.createPool(MYSQL_CONFIG);
    
    // Test connection
    const connection = await pool.getConnection();
    console.log('✓ MySQL connected successfully');
    connection.release();
  } catch (error) {
    console.error('✗ MySQL connection error:', error);
    throw error;
  }
};

/**
 * Get MySQL connection pool
 */
export const getMySQLPool = (): mysql.Pool => {
  if (!pool) {
    throw new Error('MySQL pool not initialized. Call initMySQL() first.');
  }
  return pool;
};

/**
 * Execute a query with automatic connection management
 */
export const query = async <T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> => {
  const pool = getMySQLPool();
  const [rows] = await pool.execute(sql, params || []);
  return rows as T[];
};

/**
 * Execute a query and return first row
 */
export const queryOne = async <T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> => {
  const results = await query<T>(sql, params);
  return results.length > 0 ? results[0] : null;
};

/**
 * Execute an INSERT query and return insert ID
 */
export const insert = async (
  sql: string,
  params?: any[]
): Promise<number> => {
  const pool = getMySQLPool();
  const [result] = await pool.execute(sql, params || []);
  return (result as mysql.ResultSetHeader).insertId;
};

/**
 * Execute an UPDATE/DELETE query and return affected rows
 */
export const update = async (
  sql: string,
  params?: any[]
): Promise<number> => {
  const pool = getMySQLPool();
  const [result] = await pool.execute(sql, params || []);
  return (result as mysql.ResultSetHeader).affectedRows;
};

/**
 * Close MySQL connection pool
 */
export const closeMySQL = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('MySQL connection pool closed');
  }
};

export default {
  initMySQL,
  getMySQLPool,
  query,
  queryOne,
  insert,
  update,
  closeMySQL,
};

