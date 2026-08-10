import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/pool.js';
import { requireParent } from '../middleware/auth.js';

export const reportsRouter = Router();
reportsRouter.use(requireParent);

reportsRouter.post(
  '/',
  [
    body('reason').trim().isLength({ min: 1, max: 500 }),
    body('targetPostId').optional().isUUID(),
    body('targetChildId').optional().isUUID()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason, targetPostId, targetChildId } = req.body;
    // TODO: wire this to an alert (email/SMS/Slack) to whoever runs
    // moderation for this deployment - a report sitting unread in the
    // database is not a safety feature.
    const result = await pool.query(
      `INSERT INTO reports (reporter_parent_id, target_post_id, target_child_id, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id, status, created_at`,
      [req.parentId, targetPostId || null, targetChildId || null, reason]
    );

    res.status(201).json({ report: result.rows[0] });
  }
);
