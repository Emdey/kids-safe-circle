import { pool } from './pool.js';

export async function childBelongsToParent(childId, parentId) {
  const result = await pool.query('SELECT id FROM children WHERE id = $1 AND parent_id = $2', [childId, parentId]);
  return result.rowCount > 0;
}

// A post is visible to a parent only if it has bloomed AND it belongs to
// their own family or a family they're in an approved connection with.
// Comments and reactions both call this before doing anything with a
// post, so the circle boundary is enforced in exactly one place.
export async function postVisibleToParent(postId, parentId) {
  const result = await pool.query(
    `SELECT 1 FROM posts p
     WHERE p.id = $1
       AND p.moderation_status = 'bloom'
       AND (
         p.parent_id = $2
         OR p.parent_id IN (
           SELECT CASE WHEN parent_a_id = $2 THEN parent_b_id ELSE parent_a_id END
           FROM connections
           WHERE status = 'approved' AND (parent_a_id = $2 OR parent_b_id = $2)
         )
       )`,
    [postId, parentId]
  );
  return result.rowCount > 0;
}
