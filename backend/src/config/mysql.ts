import mysql from 'mysql2/promise';
import { env } from './env';

const MYSQL_CONFIG = {
  host: env.mysql.host,
  port: env.mysql.port,
  user: env.mysql.user,
  password: env.mysql.password,
  database: env.mysql.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
};

let pool: mysql.Pool | null = null;
export const initMySQL = async (): Promise<void> => {
  try {
    pool = mysql.createPool(MYSQL_CONFIG);

    const connection = await pool.getConnection();
    console.log('✓ MySQL connected successfully');
    connection.release();
  } catch (error) {
    console.error('✗ MySQL connection error:', error);
    throw error;
  }
};
export const getMySQLPool = (): mysql.Pool => {
  if (!pool) {
    throw new Error('MySQL pool not initialized. Call initMySQL() first.');
  }
  return pool;
};
export const query = async <T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> => {
  const pool = getMySQLPool();
  const [rows] = await pool.execute(sql, params || []);
  return rows as T[];
};
export const queryOne = async <T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> => {
  const results = await query<T>(sql, params);
  return results.length > 0 ? results[0] : null;
};
export const insert = async (
  sql: string,
  params?: any[]
): Promise<number> => {
  const pool = getMySQLPool();
  const [result] = await pool.execute(sql, params || []);
  return (result as mysql.ResultSetHeader).insertId;
};
export const update = async (
  sql: string,
  params?: any[]
): Promise<number> => {
  const pool = getMySQLPool();
  const [result] = await pool.execute(sql, params || []);
  return (result as mysql.ResultSetHeader).affectedRows;
};
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

