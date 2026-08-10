import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/pool.js';
import { requireParent } from '../middleware/auth.js';

export const connectionsRouter = Router();
connectionsRouter.use(requireParent);

// Deliberately no GET /connections/search or directory endpoint exists.
// A parent can only start a connection if they already know the other
// parent's exact email - there is no way to browse or discover accounts.
connectionsRouter.post(
  '/',
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const other = await pool.query('SELECT id FROM parents WHERE email = $1', [req.body.email]);
    if (other.rowCount === 0) {
      // Same message as "already connected" below - don't reveal whether
      // an account with that email exists.
      return res.status(200).json({ message: 'If that account exists, a request has been sent.' });
    }

    const otherId = other.rows[0].id;
    if (otherId === req.parentId) {
      return res.status(400).json({ error: "You can't connect with your own account." });
    }

    try {
      await pool.query(
        `INSERT INTO connections (parent_a_id, parent_b_id, requested_by)
         VALUES ($1, $2, $1)`,
        [req.parentId, otherId]
      );
    } catch (err) {
      if (err.code !== '23505') {
        console.error(err);
        return res.status(500).json({ error: 'Could not send request.' });
      }
      // Already exists - fall through to the same generic response.
    }

    res.status(200).json({ message: 'If that account exists, a request has been sent.' });
  }
);

connectionsRouter.get('/', async (req, res) => {
  const result = await pool.query(
    `SELECT c.id, c.status, c.requested_by, c.created_at,
            CASE WHEN c.parent_a_id = $1 THEN pb.email ELSE pa.email END AS other_parent_email
     FROM connections c
     JOIN parents pa ON pa.id = c.parent_a_id
     JOIN parents pb ON pb.id = c.parent_b_id
     WHERE c.parent_a_id = $1 OR c.parent_b_id = $1
     ORDER BY c.created_at DESC`,
    [req.parentId]
  );
  res.json({ connections: result.rows });
});

connectionsRouter.post('/:connectionId/respond', [body('status').isIn(['approved', 'blocked'])], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const result = await pool.query(
    `UPDATE connections
     SET status = $1, responded_at = now()
     WHERE id = $2
       AND (parent_a_id = $3 OR parent_b_id = $3)
       AND requested_by <> $3
     RETURNING id, status`,
    [req.body.status, req.params.connectionId, req.parentId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Request not found.' });
  }
  res.json({ connection: result.rows[0] });
});
