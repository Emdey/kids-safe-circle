/**
 * Incremental migration - run this once against a database that was
 * already set up before video support existed. (schema.sql already
 * includes 'video' for anyone provisioning a brand new database, so
 * this file is only needed to catch an existing one up.)
 *
 * Usage:
 *   DATABASE_URL="..." node src/db/migrate-add-video-support.js
 */
import { pool } from './pool.js';

async function migrate() {
  console.log("Adding 'video' to post_content_type ...");
  // ADD VALUE can't run inside some transaction contexts, and can't be
  // undone - IF NOT EXISTS makes this safe to run more than once.
  await pool.query("ALTER TYPE post_content_type ADD VALUE IF NOT EXISTS 'video'");
  console.log('Done.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
