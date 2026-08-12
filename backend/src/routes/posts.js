import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/pool.js';
import { requireParent } from '../middleware/auth.js';
import { postCreateLimiter } from '../middleware/rateLimiter.js';
import { childBelongsToParent, postVisibleToParent } from '../db/helpers.js';
import { moderateText, moderateImage, moderateVideo } from '../services/moderation.js';

export const postsRouter = Router();
postsRouter.use(requireParent);

// Fixed, small emoji set - the only "reaction" vocabulary that exists.
// Because it's not free text, reactions skip the moderation queue
// entirely (see schema.sql's note on post_reactions).
export const REACTION_EMOJI = ['🌻', '💚', '😊', '👍', '🎉'];

// A child "posts" through their parent's authenticated session (see
// KidGarden.jsx - the composer only ever calls this while a parent is
// signed in on the shared family device). Nothing here is public yet:
// it lands as 'seed' or 'sprout', never 'bloom', until a parent approves it.
postsRouter.post(
  '/',
  postCreateLimiter,
  [
    body('childId').isUUID(),
    body('contentType').isIn(['text', 'image', 'video']),
    body('textContent').optional().isLength({ max: 500 }),
    body('mediaUrl').optional().isURL()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { childId, contentType, textContent, mediaUrl } = req.body;
    if (!(await childBelongsToParent(childId, req.parentId))) {
      return res.status(403).json({ error: 'Not your child profile.' });
    }

    let check;
    if (contentType === 'text') {
      check = await moderateText(textContent || '');
    } else if (contentType === 'image') {
      check = await moderateImage(mediaUrl);
    } else {
      check = await moderateVideo(mediaUrl);
    }

    const result = await pool.query(
      `INSERT INTO posts (child_id, parent_id, content_type, text_content, media_url, moderation_status, auto_check_passed, moderation_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, moderation_status, created_at`,
      [
        childId,
        req.parentId,
        contentType,
        textContent || null,
        mediaUrl || null,
        check.passed ? 'sprout' : 'seed', // 'seed' = held, failed the automated screen; 'sprout' = awaiting parent review
        check.passed,
        check.reason
      ]
    );

    res.status(201).json({ post: result.rows[0] });
  }
);

// A parent's own review queue: their children's posts, whatever the
// automated check said, always require an explicit human decision.
postsRouter.get('/queue', async (req, res) => {
  const result = await pool.query(
    `SELECT p.id, p.content_type, p.text_content, p.media_url, p.moderation_status,
            p.auto_check_passed, p.moderation_notes, p.created_at, c.display_name AS child_name
     FROM posts p
     JOIN children c ON c.id = p.child_id
     WHERE p.parent_id = $1 AND p.moderation_status IN ('seed', 'sprout')
     ORDER BY p.created_at ASC`,
    [req.parentId]
  );
  res.json({ queue: result.rows });
});

postsRouter.post('/:postId/decide', [body('decision').isIn(['bloom', 'wilted'])], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const result = await pool.query(
    `UPDATE posts
     SET moderation_status = $1, reviewed_at = now()
     WHERE id = $2 AND parent_id = $3
     RETURNING id, moderation_status`,
    [req.body.decision, req.params.postId, req.parentId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Post not found.' });
  }
  res.json({ post: result.rows[0] });
});

// Toggle a reaction: tapping the same emoji again removes it. childId is
// which of the signed-in parent's children is reacting (same pattern as
// posting - the parent's session is the authentication, the child is
// just which profile is "speaking").
postsRouter.post(
  '/:postId/reactions',
  [body('childId').isUUID(), body('emoji').isIn(REACTION_EMOJI)],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { childId, emoji } = req.body;
    if (!(await childBelongsToParent(childId, req.parentId))) {
      return res.status(403).json({ error: 'Not your child profile.' });
    }
    if (!(await postVisibleToParent(req.params.postId, req.parentId))) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const existing = await pool.query(
      'SELECT id FROM post_reactions WHERE post_id = $1 AND child_id = $2 AND emoji = $3',
      [req.params.postId, childId, emoji]
    );

    if (existing.rowCount > 0) {
      await pool.query('DELETE FROM post_reactions WHERE id = $1', [existing.rows[0].id]);
      return res.json({ reacted: false });
    }

    await pool.query('INSERT INTO post_reactions (post_id, child_id, emoji) VALUES ($1, $2, $3)', [
      req.params.postId,
      childId,
      emoji
    ]);
    res.json({ reacted: true });
  }
);

// The feed: only 'bloom' posts, only from this parent's own children plus
// children of parents in an 'approved' connection. No global feed exists.
postsRouter.get('/feed', async (req, res) => {
  const posts = await pool.query(
    `SELECT p.id, p.content_type, p.text_content, p.media_url, p.created_at,
            c.display_name AS child_name, c.avatar_key, c.favorite_color
     FROM posts p
     JOIN children c ON c.id = p.child_id
     WHERE p.moderation_status = 'bloom'
       AND (
         p.parent_id = $1
         OR p.parent_id IN (
           SELECT CASE WHEN parent_a_id = $1 THEN parent_b_id ELSE parent_a_id END
           FROM connections
           WHERE status = 'approved' AND (parent_a_id = $1 OR parent_b_id = $1)
         )
       )
     ORDER BY p.created_at DESC
     LIMIT 100`,
    [req.parentId]
  );

  const postIds = posts.rows.map((p) => p.id);
  let reactionsByPost = {};
  let commentCountByPost = {};

  if (postIds.length > 0) {
    const reactions = await pool.query(
      `SELECT post_id, emoji, COUNT(*)::int AS count
       FROM post_reactions
       WHERE post_id = ANY($1)
       GROUP BY post_id, emoji`,
      [postIds]
    );
    reactionsByPost = reactions.rows.reduce((acc, r) => {
      (acc[r.post_id] ||= []).push({ emoji: r.emoji, count: r.count });
      return acc;
    }, {});

    const commentCounts = await pool.query(
      `SELECT post_id, COUNT(*)::int AS count
       FROM comments
       WHERE post_id = ANY($1) AND moderation_status = 'bloom'
       GROUP BY post_id`,
      [postIds]
    );
    commentCountByPost = commentCounts.rows.reduce((acc, r) => {
      acc[r.post_id] = r.count;
      return acc;
    }, {});
  }

  const withExtras = posts.rows.map((p) => ({
    ...p,
    reactions: reactionsByPost[p.id] || [],
    comment_count: commentCountByPost[p.id] || 0
  }));

  res.json({ posts: withExtras, reactionEmoji: REACTION_EMOJI });
});
