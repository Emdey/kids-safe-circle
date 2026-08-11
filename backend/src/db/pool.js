import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Render's Postgres requires SSL, whether you're connecting from Render
// itself or migrating from a laptop/phone. Only skip it for a genuinely
// local database.
const isLocalDb = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalDb ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error', err);
});
