import jwt from 'jsonwebtoken';

/**
 * Every protected route requires a parent to be authenticated.
 * Children never hold their own token - see routes/children.js for how a
 * child profile is selected inside an already-authenticated parent session.
 */
export function requireParent(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Sign in required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.parentId = payload.parentId;
    next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}
