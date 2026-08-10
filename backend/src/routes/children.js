import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/pool.js';
import { requireParent } from '../middleware/auth.js';

export const childrenRouter = Router();
childrenRouter.use(requireParent);

const AVATARS = ['sprout-1', 'sprout-2', 'sprout-3', 'sprout-4', 'sprout-5', 'sprout-6'];

// List only this parent's own children - never any other family's.
childrenRouter.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT id, display_name, avatar_key, birth_year FROM children WHERE parent_id = $1 ORDER BY created_at',
    [req.parentId]
  );
  res.json({ children: result.rows });
});

childrenRouter.post(
  '/',
  [
    body('displayName').trim().isLength({ min: 1, max: 40 }),
    body('avatarKey').isIn(AVATARS),
    body('birthYear').optional().isInt({ min: new Date().getFullYear() - 12, max: new Date().getFullYear() - 3 }),
    body('pin').optional().isLength({ min: 4, max: 4 }).isNumeric()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { displayName, avatarKey, birthYear, pin } = req.body;
    const pinHash = pin ? await bcrypt.hash(pin, 10) : null;

    const result = await pool.query(
      `INSERT INTO children (parent_id, display_name, avatar_key, birth_year, pin_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, display_name, avatar_key, birth_year`,
      [req.parentId, displayName, avatarKey, birthYear || null, pinHash]
    );

    res.status(201).json({ child: result.rows[0] });
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
