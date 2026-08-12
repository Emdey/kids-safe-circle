/**
 * Incremental migration - adds comments, reactions, and richer child
 * profiles (favorite_color, bio) to a database that already exists.
 * Safe to run more than once (every statement checks first).
 *
 * Usage:
 *   DATABASE_URL="..." node src/db/migrate-add-social-features.js
 */
import { pool } from './pool.js';

const statements = [
  `ALTER TABLE children ADD COLUMN IF NOT EXISTS favorite_color TEXT NOT NULL DEFAULT 'sunshine'`,
  `ALTER TABLE children ADD COLUMN IF NOT EXISTS bio TEXT`,
  `ALTER TABLE children ALTER COLUMN avatar_key SET DEFAULT 'sprout'`,

  `CREATE TABLE IF NOT EXISTS comments (
     id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     post_id           UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
     child_id          UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
     parent_id         UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
     text_content      TEXT NOT NULL,
     moderation_status moderation_status NOT NULL DEFAULT 'seed',
     moderation_notes  TEXT,
     auto_check_passed BOOLEAN,
     created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
     reviewed_at       TIMESTAMPTZ
   )`,

  `CREATE TABLE IF NOT EXISTS post_reactions (
     id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
     child_id   UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
     emoji      TEXT NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE (post_id, child_id, emoji)
   )`,

  `CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id)`,
  `CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(moderation_status)`,
  `CREATE INDEX IF NOT EXISTS idx_reactions_post ON post_reactions(post_id)`
];

async function migrate() {
  for (const sql of statements) {
    console.log(sql.split('\n')[0].trim().slice(0, 60) + ' ...');
    await pool.query(sql);
  }
  console.log('Done.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
