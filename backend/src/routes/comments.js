import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/pool.js';
import { requireParent } from '../middleware/auth.js';
import { postCreateLimiter } from '../middleware/rateLimiter.js';
import { childBelongsToParent, postVisibleToParent } from '../db/helpers.js';
import { moderateText } from '../services/moderation.js';

export const commentsRouter = Router();
commentsRouter.use(requireParent);

// Comments are free text from a child, so - same as posts - nothing is
// visible to anyone outside the family until moderateText clears it AND
// a parent explicitly approves it in their queue below.
commentsRouter.post(
  '/',
  postCreateLimiter,
  [body('postId').isUUID(), body('childId').isUUID(), body('textContent').trim().isLength({ min: 1, max: 300 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { postId, childId, textContent } = req.body;
    if (!(await childBelongsToParent(childId, req.parentId))) {
      return res.status(403).json({ error: 'Not your child profile.' });
    }
    if (!(await postVisibleToParent(postId, req.parentId))) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const check = await moderateText(textContent);

    const result = await pool.query(
      `INSERT INTO comments (post_id, child_id, parent_id, text_content, moderation_status, auto_check_passed, moderation_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, moderation_status, created_at`,
      [postId, childId, req.parentId, textContent, check.passed ? 'sprout' : 'seed', check.passed, check.reason]
    );

    res.status(201).json({ comment: result.rows[0] });
  }
);

// Only the approved comments on a post this parent can already see.
commentsRouter.get('/for-post/:postId', async (req, res) => {
  if (!(await postVisibleToParent(req.params.postId, req.parentId))) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  const result = await pool.query(
    `SELECT co.id, co.text_content, co.created_at, ch.display_name AS child_name, ch.avatar_key
     FROM comments co
     JOIN children ch ON ch.id = co.child_id
     WHERE co.post_id = $1 AND co.moderation_status = 'bloom'
     ORDER BY co.created_at ASC`,
    [req.params.postId]
  );
  res.json({ comments: result.rows });
});

// A parent's own review queue for their children's pending comments -
// same shape as the posts queue, shown alongside it in the dashboard.
commentsRouter.get('/queue', async (req, res) => {
  const result = await pool.query(
    `SELECT co.id, co.text_content, co.moderation_status, co.auto_check_passed,
            co.moderation_notes, co.created_at, ch.display_name AS child_name,
            p.text_content AS post_text_content, p.content_type AS post_content_type
     FROM comments co
     JOIN children ch ON ch.id = co.child_id
     JOIN posts p ON p.id = co.post_id
     WHERE co.parent_id = $1 AND co.moderation_status IN ('seed', 'sprout')
     ORDER BY co.created_at ASC`,
    [req.parentId]
  );
  res.json({ queue: result.rows });
});

commentsRouter.post('/:commentId/decide', [body('decision').isIn(['bloom', 'wilted'])], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const result = await pool.query(
    `UPDATE comments
     SET moderation_status = $1, reviewed_at = now()
     WHERE id = $2 AND parent_id = $3
     RETURNING id, moderation_status`,
    [req.body.decision, req.params.commentId, req.parentId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Comment not found.' });
  }
  res.json({ comment: result.rows[0] });
});
