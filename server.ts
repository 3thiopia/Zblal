import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { getRegistrationsByUserId } from './src/db/registrations.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { optionalAuth, requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import {
  adminCreateCompetition,
  adminGetArcadeOverview,
  adminGetCompetitionStandingsAndWinners,
  adminGetLeaderboards,
  adminGetPlayerDetails,
  adminListCompetitions,
  adminListHistoricalWinners,
  adminListPlayersAndScores,
  adminQueryAllScores,
  adminReviewWinner,
  adminSnapshotPendingWinners,
  adminUpdateCompetition,
  adminUpdatePlayerStatus,
  adminUpdateScoreValidation,
  createAdminPasscodeToken,
  fetchPublicArcadePlayer,
  fetchPublicCompetitionsOverview,
  fetchPublicLeaderboard,
  isAuthorizedAdminEmail,
  registerOrResumeArcadePlayer,
  submitArcadeScore,
  verifyAdminPasscodeToken,
} from './src/server/arcadeServer.ts';
import {
  HttpError,
  fetchServerLocationsBySubcity,
  fetchServerServicePriorities,
  fetchServerSubcities,
  getServerSupabaseClient,
  processRegistrationSubmission,
} from './src/server/supabaseServer.ts';
import type {
  LeaderboardPeriod,
  PlayerStatus,
  ScoreValidationStatus,
} from './src/arcade/arcadeConfig.ts';

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

// ---------------------------------------------------------------------------
// POPO Arcade Public & Player Endpoints (No private phone numbers exposed)
// ---------------------------------------------------------------------------
app.get('/api/arcade/schema-status', async (_req, res) => {
  try {
    const client = getServerSupabaseClient();
    const tables = [
      'arcade_players',
      'arcade_competitions',
      'arcade_scores',
      'arcade_winners',
      'arcade_winner_audit_logs',
    ];
    const results: Record<string, string> = {};
    let initialized = true;
    for (const table of tables) {
      const { error } = await client.from(table).select('id').limit(1);
      if (error) {
        initialized = false;
        results[table] = error.code ? `${error.code}: ${error.message}` : error.message;
      } else {
        results[table] = 'ok';
      }
    }
    res.json({ initialized, tables: results });
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Schema check failed.';
    res.status(status).json({ initialized: false, error: message });
  }
});

app.post('/api/arcade/players/register', async (req, res) => {
  try {
    const result = await registerOrResumeArcadePlayer(req.body ?? {});
    res.status(result.returning ? 200 : 201).json(result);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to register player.';
    res.status(status).json({ error: message });
  }
});

app.get('/api/arcade/players/me', async (req, res) => {
  try {
    const playerId =
      typeof req.query.playerId === 'string' ? req.query.playerId.trim() : '';
    const player = await fetchPublicArcadePlayer(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player profile not found.' });
    }
    return res.json({ player });
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to load player profile.';
    return res.status(status).json({ error: message });
  }
});

app.post('/api/arcade/scores', async (req, res) => {
  try {
    const result = await submitArcadeScore(req.body ?? {});
    res.status(201).json(result);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to submit score.';
    res.status(status).json({ error: message });
  }
});

app.get('/api/arcade/leaderboards', async (req, res) => {
  try {
    const gameId =
      typeof req.query.gameId === 'string' ? req.query.gameId.trim() : 'poop-man';
    const rawPeriod =
      typeof req.query.period === 'string' ? req.query.period.trim() : 'daily';
    const period: LeaderboardPeriod =
      rawPeriod === 'weekly' || rawPeriod === 'all_time' ? rawPeriod : 'daily';
    const playerId =
      typeof req.query.playerId === 'string' ? req.query.playerId.trim() : null;
    const competitionId =
      typeof req.query.competitionId === 'string'
        ? req.query.competitionId.trim()
        : null;

    const leaderboard = await fetchPublicLeaderboard({
      gameId,
      period,
      playerId,
      competitionId,
    });
    res.json(leaderboard);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to load leaderboard.';
    res.status(status).json({ error: message });
  }
});

app.get('/api/arcade/competitions/overview', async (req, res) => {
  try {
    const playerId =
      typeof req.query.playerId === 'string' ? req.query.playerId.trim() : null;
    const overview = await fetchPublicCompetitionsOverview(playerId);
    res.json(overview);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to load competitions.';
    res.status(status).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POPO Admin Authentication & Arcade Rewards / Competitions Management
// ---------------------------------------------------------------------------
interface AdminAuthedRequest extends express.Request {
  adminEmail?: string;
}

async function requireAdmin(
  req: AdminAuthedRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin sign-in required.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (token.startsWith('passcode.')) {
    if (verifyAdminPasscodeToken(token)) {
      req.adminEmail = 'admin-passcode';
      return next();
    }
    return res.status(401).json({ error: 'Invalid or expired admin session.' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!isAuthorizedAdminEmail(decoded.email)) {
      return res.status(403).json({
        error: 'This account is not authorized to access the Zblal Admin Dashboard.',
      });
    }
    req.adminEmail = decoded.email ?? decoded.uid;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin token.' });
  }
}

app.get('/api/admin/arcade/auth-config', (_req, res) => {
  res.json({
    passcodeEnabled: Boolean(process.env.ADMIN_PASSCODE?.trim()),
    firebaseEnabled: true,
  });
});

app.post('/api/admin/arcade/passcode-login', (req, res) => {
  const passcode =
    typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
  const token = createAdminPasscodeToken(passcode);
  if (!token) {
    return res.status(401).json({ error: 'Invalid admin passcode.' });
  }
  return res.json({ token, email: 'admin-passcode' });
});

app.get('/api/admin/arcade/session', requireAdmin, (req: AdminAuthedRequest, res) => {
  res.json({ authorized: true, adminEmail: req.adminEmail });
});

app.get('/api/admin/arcade/competitions', requireAdmin, async (_req, res) => {
  try {
    const competitions = await adminListCompetitions();
    res.json({ competitions });
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to list competitions.';
    res.status(status).json({ error: message });
  }
});

app.post('/api/admin/arcade/competitions', requireAdmin, async (req, res) => {
  try {
    const competition = await adminCreateCompetition(req.body ?? {});
    res.status(201).json({ competition });
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to create competition.';
    res.status(status).json({ error: message });
  }
});

app.patch('/api/admin/arcade/competitions/:id', requireAdmin, async (req, res) => {
  try {
    const competition = await adminUpdateCompetition(req.params.id, req.body ?? {});
    res.json({ competition });
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to update competition.';
    res.status(status).json({ error: message });
  }
});

app.get(
  '/api/admin/arcade/competitions/:id/winners',
  requireAdmin,
  async (req, res) => {
    try {
      const details = await adminGetCompetitionStandingsAndWinners(req.params.id);
      res.json(details);
    } catch (error: unknown) {
      const status = error instanceof HttpError ? error.status : 500;
      const message =
        error instanceof Error ? error.message : 'Failed to load competition winners.';
      res.status(status).json({ error: message });
    }
  }
);

app.post(
  '/api/admin/arcade/competitions/:id/snapshot-winners',
  requireAdmin,
  async (req: AdminAuthedRequest, res) => {
    try {
      const winners = await adminSnapshotPendingWinners(
        req.params.id,
        req.adminEmail ?? 'admin'
      );
      res.status(201).json({ winners });
    } catch (error: unknown) {
      const status = error instanceof HttpError ? error.status : 500;
      const message =
        error instanceof Error ? error.message : 'Failed to generate winner review.';
      res.status(status).json({ error: message });
    }
  }
);

app.patch(
  '/api/admin/arcade/winners/:winnerId',
  requireAdmin,
  async (req: AdminAuthedRequest, res) => {
    try {
      const winner = await adminReviewWinner(
        req.params.winnerId,
        req.body ?? {},
        req.adminEmail ?? 'admin'
      );
      res.json({ winner });
    } catch (error: unknown) {
      const status = error instanceof HttpError ? error.status : 500;
      const message =
        error instanceof Error ? error.message : 'Failed to update winner status.';
      res.status(status).json({ error: message });
    }
  }
);

app.get('/api/admin/arcade/overview', requireAdmin, async (_req, res) => {
  try {
    const overview = await adminGetArcadeOverview();
    res.json(overview);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to load arcade overview.';
    res.status(status).json({ error: message });
  }
});

app.get('/api/admin/arcade/players', requireAdmin, async (req, res) => {
  try {
    const search =
      typeof req.query.search === 'string' ? req.query.search : undefined;
    const statusFilter =
      typeof req.query.status === 'string' ? req.query.status : undefined;
    const payload = await adminListPlayersAndScores({
      search,
      status: statusFilter,
    });
    res.json(payload);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to load arcade players.';
    res.status(status).json({ error: message });
  }
});

app.get('/api/admin/arcade/players/:playerId', requireAdmin, async (req, res) => {
  try {
    const details = await adminGetPlayerDetails(req.params.playerId);
    res.json(details);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to load player details.';
    res.status(status).json({ error: message });
  }
});

app.patch('/api/admin/arcade/players/:playerId/status', requireAdmin, async (req, res) => {
  try {
    const result = await adminUpdatePlayerStatus(
      req.params.playerId,
      req.body?.status as PlayerStatus
    );
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to update player status.';
    res.status(status).json({ error: message });
  }
});

app.get('/api/admin/arcade/scores', requireAdmin, async (req, res) => {
  try {
    const q = req.query;
    const result = await adminQueryAllScores({
      datePreset: typeof q.datePreset === 'string' ? q.datePreset : undefined,
      startDate: typeof q.startDate === 'string' ? q.startDate : undefined,
      endDate: typeof q.endDate === 'string' ? q.endDate : undefined,
      gameId: typeof q.gameId === 'string' ? q.gameId : undefined,
      playerId: typeof q.playerId === 'string' ? q.playerId : undefined,
      playerSearch: typeof q.playerSearch === 'string' ? q.playerSearch : undefined,
      validationStatus:
        typeof q.validationStatus === 'string' ? q.validationStatus : undefined,
      sortBy: typeof q.sortBy === 'string' ? q.sortBy : undefined,
      page: typeof q.page === 'string' ? Number(q.page) : undefined,
      pageSize: typeof q.pageSize === 'string' ? Number(q.pageSize) : undefined,
    });
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to load arcade scores.';
    res.status(status).json({ error: message });
  }
});

app.patch('/api/admin/arcade/scores/:scoreId/validation', requireAdmin, async (req, res) => {
  try {
    const result = await adminUpdateScoreValidation(
      req.params.scoreId,
      req.body?.validationStatus as ScoreValidationStatus,
      typeof req.body?.validationReason === 'string'
        ? req.body.validationReason
        : undefined
    );
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to update score status.';
    res.status(status).json({ error: message });
  }
});

app.get('/api/admin/arcade/leaderboards', requireAdmin, async (req, res) => {
  try {
    const rawPeriod =
      typeof req.query.period === 'string' ? req.query.period.trim() : 'daily';
    const period: LeaderboardPeriod =
      rawPeriod === 'weekly' || rawPeriod === 'all_time' ? rawPeriod : 'daily';
    const competitionId =
      typeof req.query.competitionId === 'string'
        ? req.query.competitionId.trim()
        : null;
    const result = await adminGetLeaderboards({ period, competitionId });
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to load admin leaderboards.';
    res.status(status).json({ error: message });
  }
});

app.get('/api/admin/arcade/winners/history', requireAdmin, async (_req, res) => {
  try {
    const result = await adminListHistoricalWinners();
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to load historical winners.';
    res.status(status).json({ error: message });
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
