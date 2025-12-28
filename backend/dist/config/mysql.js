"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeMySQL = exports.update = exports.insert = exports.queryOne = exports.query = exports.getMySQLPool = exports.initMySQL = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const MYSQL_CONFIG = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'donation_charity',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
};
let pool = null;
const initMySQL = async () => {
    try {
        pool = promise_1.default.createPool(MYSQL_CONFIG);
        const connection = await pool.getConnection();
        console.log('✓ MySQL connected successfully');
        connection.release();
    }
    catch (error) {
        console.error('✗ MySQL connection error:', error);
        throw error;
    }
};
exports.initMySQL = initMySQL;
const getMySQLPool = () => {
    if (!pool) {
        throw new Error('MySQL pool not initialized. Call initMySQL() first.');
    }
    return pool;
};
exports.getMySQLPool = getMySQLPool;
const query = async (sql, params) => {
    const pool = (0, exports.getMySQLPool)();
    const [rows] = await pool.execute(sql, params || []);
    return rows;
};
exports.query = query;
const queryOne = async (sql, params) => {
    const results = await (0, exports.query)(sql, params);
    return results.length > 0 ? results[0] : null;
};
exports.queryOne = queryOne;
const insert = async (sql, params) => {
    const pool = (0, exports.getMySQLPool)();
    const [result] = await pool.execute(sql, params || []);
    return result.insertId;
};
exports.insert = insert;
const update = async (sql, params) => {
    const pool = (0, exports.getMySQLPool)();
    const [result] = await pool.execute(sql, params || []);
    return result.affectedRows;
};
exports.update = update;
const closeMySQL = async () => {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('MySQL connection pool closed');
    }
};
exports.closeMySQL = closeMySQL;
exports.default = {
    initMySQL: exports.initMySQL,
    getMySQLPool: exports.getMySQLPool,
    query: exports.query,
    queryOne: exports.queryOne,
    insert: exports.insert,
    update: exports.update,
    closeMySQL: exports.closeMySQL,
};
