import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { getRegistrationsByUserId } from './src/db/registrations.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { optionalAuth, requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  HttpError,
  fetchServerLocationsBySubcity,
  fetchServerServicePriorities,
  fetchServerSubcities,
  processRegistrationSubmission,
} from './src/server/supabaseServer.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/catalog/subcities', async (_req, res) => {
  try {
    const subcities = await fetchServerSubcities();
    res.json({ subcities });
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to load subcities.';
    res.status(status).json({ error: message });
  }
});

app.get('/api/catalog/locations', async (req, res) => {
  try {
    const subcityId =
      typeof req.query.subcityId === 'string' ? req.query.subcityId.trim() : '';
    const locations = await fetchServerLocationsBySubcity(subcityId);
    res.json({ locations });
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to load locations.';
    res.status(status).json({ error: message });
  }
});

app.get('/api/catalog/service-priorities', async (_req, res) => {
  try {
    const priorities = await fetchServerServicePriorities();
    res.json({ priorities });
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to load service priorities.';
    res.status(status).json({ error: message });
  }
});

app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userRecord = await getOrCreateUser(
      req.user!.uid,
      req.user!.email || ''
    );
    res.json({ user: userRecord });
  } catch (error: unknown) {
    console.error('Failed to sync user:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    res.status(500).json({ error: message });
  }
});

app.get('/api/registrations', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userRecord = await getOrCreateUser(
      req.user!.uid,
      req.user!.email || ''
    );
    const items = await getRegistrationsByUserId(userRecord.id);
    res.json({ registrations: items });
  } catch (error: unknown) {
    console.error('Failed to fetch registrations:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch registrations';
    res.status(500).json({ error: message });
  }
});

app.post('/api/registrations', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const registration = await processRegistrationSubmission(
      req.body ?? {},
      req.user
        ? { uid: req.user.uid, email: req.user.email || '' }
        : null
    );

    return res.status(201).json({ registration });
  } catch (error: unknown) {
    console.error('Failed to create registration:', error);
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to complete registration. Please try again.';
    return res.status(status).json({ error: message });
  }
});

async function startServer() {
  const distDir = path.resolve(__dirname, 'dist');
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (process.env.NODE_ENV !== 'development' && fs.existsSync(distDir));

  if (isProd) {
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zblal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
