import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { generalLimiter, authLimiter } from './middleware/rateLimiter.js';
import { authRouter } from './routes/auth.js';
import { childrenRouter } from './routes/children.js';
import { connectionsRouter } from './routes/connections.js';
import { postsRouter } from './routes/posts.js';
import { reportsRouter } from './routes/reports.js';

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGIN'];
const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(generalLimiter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth', authLimiter, authRouter);
app.use('/children', childrenRouter);
app.use('/connections', connectionsRouter);
app.use('/posts', postsRouter);
app.use('/reports', reportsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Centralized error handler - never leak stack traces to the client.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Kids Safe Circle API listening on port ${port}`);
});
