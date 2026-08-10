import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/pool.js';

export const authRouter = Router();

function signToken(parentId) {
  return jwt.sign({ parentId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

authRouter.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 10 }).withMessage('Use at least 10 characters.'),
    body('consentAcknowledged')
      .equals('true')
      .withMessage('You must confirm you are the parent or guardian setting this account up.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 12);

    try {
      const result = await pool.query(
        `INSERT INTO parents (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, email`,
        [email, passwordHash]
      );
      const parent = result.rows[0];

      // A real deployment sends this token by email and only sets
      // consent_verified_at once the parent clicks the link - that is
      // "verifiable parental consent" under COPPA, not just a checkbox.
      const verificationToken = crypto.randomBytes(24).toString('hex');
      // TODO: send verificationToken to `email` via your email provider,
      // and add a route that marks consent_verified_at = now() when
      // clicked. Logged here only so local dev can exercise the flow.
      console.log(`[dev only] verification link token for ${email}: ${verificationToken}`);

      const token = signToken(parent.id);
      res.status(201).json({ token, parent: { id: parent.id, email: parent.email } });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'An account with that email already exists.' });
      }
      console.error(err);
      res.status(500).json({ error: 'Could not create account.' });
    }
  }
);

authRouter.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const result = await pool.query('SELECT id, email, password_hash FROM parents WHERE email = $1', [email]);
    const parent = result.rows[0];

    // Same generic error whether the email doesn't exist or the password
    // is wrong, so login attempts can't be used to enumerate accounts.
    if (!parent || !(await bcrypt.compare(password, parent.password_hash))) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const token = signToken(parent.id);
    res.json({ token, parent: { id: parent.id, email: parent.email } });
  }
);
