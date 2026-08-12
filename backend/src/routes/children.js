import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/pool.js';
import { requireParent } from '../middleware/auth.js';

export const childrenRouter = Router();
childrenRouter.use(requireParent);

// Keep this list in sync with frontend/src/constants.js - duplicated
// deliberately rather than shared, since the frontend can't import from
// the backend. Both are the single small source of truth for what's valid.
const AVATARS = ['sprout', 'sunflower', 'fern', 'clover', 'daisy', 'cactus', 'mushroom', 'acorn'];
const FAVORITE_COLORS = ['sunshine', 'sky', 'berry', 'grass', 'lavender'];

// List only this parent's own children - never any other family's.
childrenRouter.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT id, display_name, avatar_key, favorite_color, bio, birth_year FROM children WHERE parent_id = $1 ORDER BY created_at',
    [req.parentId]
  );
  res.json({ children: result.rows });
});

childrenRouter.post(
  '/',
  [
    body('displayName').trim().isLength({ min: 1, max: 40 }),
    body('avatarKey').isIn(AVATARS),
    body('favoriteColor').optional().isIn(FAVORITE_COLORS),
    body('bio').optional().trim().isLength({ max: 100 }), // parent-authored, so no moderation queue needed
    body('birthYear').optional().isInt({ min: new Date().getFullYear() - 12, max: new Date().getFullYear() - 3 }),
    body('pin').optional().isLength({ min: 4, max: 4 }).isNumeric()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { displayName, avatarKey, favoriteColor, bio, birthYear, pin } = req.body;
    const pinHash = pin ? await bcrypt.hash(pin, 10) : null;

    const result = await pool.query(
      `INSERT INTO children (parent_id, display_name, avatar_key, favorite_color, bio, birth_year, pin_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, display_name, avatar_key, favorite_color, bio, birth_year`,
      [req.parentId, displayName, avatarKey, favoriteColor || 'sunshine', bio || null, birthYear || null, pinHash]
    );

    res.status(201).json({ child: result.rows[0] });
  }
);

// Editing a profile (avatar, color, bio) - parent-authored, immediately
// visible, same trust level as setting it at creation time.
childrenRouter.patch(
  '/:childId',
  [
    body('displayName').optional().trim().isLength({ min: 1, max: 40 }),
    body('avatarKey').optional().isIn(AVATARS),
    body('favoriteColor').optional().isIn(FAVORITE_COLORS),
    body('bio').optional().trim().isLength({ max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const fields = { displayName: 'display_name', avatarKey: 'avatar_key', favoriteColor: 'favorite_color', bio: 'bio' };
    const sets = [];
    const values = [];
    for (const [bodyKey, column] of Object.entries(fields)) {
      if (req.body[bodyKey] !== undefined) {
        values.push(req.body[bodyKey]);
        sets.push(`${column} = $${values.length}`);
      }
    }
    if (sets.length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    values.push(req.params.childId, req.parentId);
    const result = await pool.query(
      `UPDATE children SET ${sets.join(', ')}
       WHERE id = $${values.length - 1} AND parent_id = $${values.length}
       RETURNING id, display_name, avatar_key, favorite_color, bio, birth_year`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Child profile not found.' });
    }
    res.json({ child: result.rows[0] });
  }
);

childrenRouter.delete('/:childId', async (req, res) => {
  const result = await pool.query('DELETE FROM children WHERE id = $1 AND parent_id = $2 RETURNING id', [
    req.params.childId,
    req.parentId
  ]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Child profile not found.' });
  }
  res.status(204).send();
});
