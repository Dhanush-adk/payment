/**
 * Raw MySQL pool (trendRushBackend style).
 * Use MYSQL_* env vars for compatibility with existing payment .env.
 * Supports RDS SSL when MYSQL_HOST contains 'rds.amazonaws.com'.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const isRds = process.env.MYSQL_HOST && String(process.env.MYSQL_HOST).includes('rds.amazonaws.com');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
  port: process.env.MYSQL_PORT || process.env.DB_PORT || 3306,
  user: process.env.MYSQL_USER || process.env.DB_USER,
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASS,
  database: process.env.MYSQL_DATABASE || process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  ...(isRds && {
    ssl: { rejectUnauthorized: false }
  })
});

module.exports = { pool };
