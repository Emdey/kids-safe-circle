import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
});

// Separate limiter instances, each with their own counter. Previously
// auth and post-creation shared ONE limiter object, which meant they
// shared one counter per IP - loading the dashboard a few times (which
// calls the posts routes) could burn through the budget meant for login
// attempts. Two instances fixes that.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' }
});

// Only applied to POST /posts (creating a post) in routes/posts.js, not
// to the GET /posts/feed or /posts/queue reads - those are covered by
// generalLimiter like everything else, so refreshing the garden or
// dashboard never eats into this budget.
export const postCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many posts in a short time. Please wait a few minutes and try again.' }
});
