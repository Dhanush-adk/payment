/**
 * Run script-trendrush-schema.sql to create TrendRush-style tables.
 * Usage: node init-trendrush-schema.js
 * Requires: MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE in .env
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./src/models/db');

async function run() {
  const sqlPath = path.join(__dirname, 'script-trendrush-schema.sql');
  let sql = fs.readFileSync(sqlPath, 'utf8');
  // Strip single-line comments (-- ...) before splitting so semicolons in comments don't break
  sql = sql.replace(/--[^\n]*/g, '');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /^CREATE\s+TABLE/i.test(s));

  const conn = await pool.getConnection();
  try {
    for (const stmt of statements) {
      if (stmt) await conn.query(stmt);
    }
    console.log('TrendRush schema applied successfully.');
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
