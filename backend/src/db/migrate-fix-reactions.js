/**
 * Fixes a bug: reactions were allowed multiple-per-child-per-post
 * (e.g. both 💚 and 😊 on the same post from the same child) instead of
 * one active reaction that switches. This cleans up any duplicates
 * already created by testing, then tightens the constraint so it can't
 * happen again at the database level.
 *
 * Usage:
 *   DATABASE_URL="..." node src/db/migrate-fix-reactions.js
 */
import { pool } from './pool.js';

async function migrate() {
  console.log('Removing duplicate reactions (keeping the most recent per child+post) ...');
  await pool.query(`
    DELETE FROM post_reactions a
    USING post_reactions b
    WHERE a.post_id = b.post_id
      AND a.child_id = b.child_id
      AND (a.created_at < b.created_at OR (a.created_at = b.created_at AND a.id < b.id))
  `);

  console.log('Dropping old per-emoji unique constraint, if present ...');
  await pool.query(`ALTER TABLE post_reactions DROP CONSTRAINT IF EXISTS post_reactions_post_id_child_id_emoji_key`);

  console.log('Adding one-reaction-per-child-per-post constraint ...');
  await pool.query(`
    ALTER TABLE post_reactions
    ADD CONSTRAINT post_reactions_post_id_child_id_key UNIQUE (post_id, child_id)
  `);

  console.log('Done.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
