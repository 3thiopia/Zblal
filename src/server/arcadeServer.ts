import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  COMPETITION_TIMEZONE,
  PLAYABLE_GAMES,
  fromDbGameCode,
  getAddisAbabaDailyWindow,
  getAddisAbabaWeeklyWindow,
  getArcadeGameMeta,
  getPlacementPoints,
  isPlayableGameId,
  toDbGameCode,
  type ArcadeCompetition,
  type ArcadeGameId,
  type CompetitionStatus,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type OverallChampionEntry,
  type OverallGameBreakdown,
  type PlayerStatus,
  type PrizeStatus,
  type PublicArcadePlayer,
  type ScoreValidationStatus,
  type WinnerApprovalStatus,
} from '../arcade/arcadeConfig.ts';
import {
  maskEthiopianPhone,
  normalizeEthiopianPhoneToE164,
} from '../utils/phone.ts';
import {
  getServerSupabaseClient,
  getServerSupabaseConfig,
  HttpError,
} from './supabaseServer.ts';

// ---------------------------------------------------------------------------
// Rate Limiting (In-memory sliding window + DB timestamp protection)
// ---------------------------------------------------------------------------
const RECENT_SUBMISSIONS = new Map<string, number[]>();
const MIN_SUBMISSION_INTERVAL_MS = 3_000;
const HOURLY_WINDOW_MS = 60 * 60 * 1000;
const MAX_SUBMISSIONS_PER_HOUR = 45;

export function resetArcadeRateLimits() {
  RECENT_SUBMISSIONS.clear();
}

function checkPlayerSubmissionRateLimit(playerId: string, nowMs: number = Date.now()) {
  const history = RECENT_SUBMISSIONS.get(playerId) ?? [];
  const recentHour = history.filter((ts) => nowMs - ts < HOURLY_WINDOW_MS);

  if (recentHour.length > 0) {
    const lastTs = recentHour[recentHour.length - 1];
    if (nowMs - lastTs < MIN_SUBMISSION_INTERVAL_MS) {
      throw new HttpError(
        429,
        'Please wait a few seconds between score submissions.'
      );
    }
  }

  if (recentHour.length >= MAX_SUBMISSIONS_PER_HOUR) {
    throw new HttpError(
      429,
      'Submission rate limit reached for this hour. Please try again shortly.'
    );
  }

  recentHour.push(nowMs);
  RECENT_SUBMISSIONS.set(playerId, recentHour);
}

// ---------------------------------------------------------------------------
// Helpers & DB Error Mapping
// ---------------------------------------------------------------------------
function ensureServiceRoleConfigured() {
  const cfg = getServerSupabaseConfig();
  if (!cfg) {
    throw new HttpError(
      503,
      'Supabase database connection is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  if (cfg.keyRole === 'anon') {
    throw new HttpError(
      503,
      'SUPABASE_SERVICE_ROLE_KEY is currently set to an anon key instead of service_role.'
    );
  }
}

function mapArcadeDbError(
  context: string,
  error: { code?: string; message?: string }
): HttpError {
  const msg = error.message ?? 'Unknown database error';
  const lower = msg.toLowerCase();
  if (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    lower.includes('could not find the table') ||
    (lower.includes('relation') && lower.includes('does not exist'))
  ) {
    return new HttpError(
      503,
      `Arcade Supabase tables are not initialized yet (${context}). Run supabase/migrations/20261116_popo_arcade.sql in your Supabase SQL Editor.`
    );
  }
  if (
    error.code === '42501' ||
    lower.includes('row-level security') ||
    lower.includes('permission denied')
  ) {
    return new HttpError(
      500,
      `Server permission error while ${context}. Verify SUPABASE_SERVICE_ROLE_KEY is configured.`
    );
  }
  return new HttpError(502, `Database error while ${context}: ${msg}`);
}

export function sanitizeNickname(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\s+/g, ' ').trim();
}

export function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    )
  );
}

// ---------------------------------------------------------------------------
// Pure Score Validation & Ranking Engine (exported for testing)
// ---------------------------------------------------------------------------
export interface RawScoreWithPlayer {
  id: string;
  playerId: string;
  nickname: string;
  phoneNumberNormalized: string;
  playerStatus: PlayerStatus;
  gameId: ArcadeGameId;
  score: number;
  playedAt: string;
  validationStatus: ScoreValidationStatus;
}

export function evaluateScoreSubmission(params: {
  gameId: string;
  score: unknown;
  durationMs: unknown;
  playerStatus: PlayerStatus;
}): {
  score: number;
  durationMs: number | null;
  validationStatus: ScoreValidationStatus;
  validationReason: string | null;
} {
  if (!isPlayableGameId(params.gameId)) {
    throw new HttpError(400, 'Scores can only be submitted for playable arcade games.');
  }

  const meta = getArcadeGameMeta(params.gameId);
  if (!meta) {
    throw new HttpError(400, 'Unknown arcade game.');
  }

  if (
    typeof params.score !== 'number' ||
    !Number.isFinite(params.score) ||
    !Number.isInteger(params.score) ||
    params.score < 0
  ) {
    throw new HttpError(400, 'Score must be a non-negative integer.');
  }

  if (params.score > meta.maxValidScore) {
    throw new HttpError(
      400,
      `Score exceeds the maximum valid range for ${meta.name}.`
    );
  }

  let durationMs: number | null = null;
  if (params.durationMs !== undefined && params.durationMs !== null) {
    if (
      typeof params.durationMs !== 'number' ||
      !Number.isFinite(params.durationMs) ||
      params.durationMs < 0
    ) {
      throw new HttpError(400, 'Invalid round duration.');
    }
    durationMs = Math.round(params.durationMs);
  }

  if (params.playerStatus === 'suspended') {
    throw new HttpError(403, 'This player profile is suspended from competition.');
  }

  if (params.playerStatus === 'flagged') {
    return {
      score: params.score,
      durationMs,
      validationStatus: 'flagged',
      validationReason: 'Player profile is flagged for review.',
    };
  }

  if (durationMs !== null && durationMs < 2000 && params.score > 0) {
    return {
      score: params.score,
      durationMs,
      validationStatus: 'flagged',
      validationReason: 'Round duration was unusually short for a positive score.',
    };
  }

  if (
    params.score >= meta.suspiciousScoreThreshold &&
    durationMs !== null &&
    durationMs > 0
  ) {
    const rate = params.score / (durationMs / 1000);
    if (rate > meta.maxPointsPerSecond) {
      return {
        score: params.score,
        durationMs,
        validationStatus: 'flagged',
        validationReason: `Score velocity (${rate.toFixed(1)}/sec) exceeded expected gameplay range.`,
      };
    }
  }

  return {
    score: params.score,
    durationMs,
    validationStatus: 'valid',
    validationReason: null,
  };
}

/**
 * Ranks players for a single game using ONLY each player's highest valid single-run
 * score during the period. Ties are broken by the earliest played_at timestamp.
 */
export function rankGameScores(
  rows: RawScoreWithPlayer[],
  gameId: ArcadeGameId,
  currentPlayerId?: string | null
): LeaderboardEntry[] {
  const bestByPlayer = new Map<string, RawScoreWithPlayer>();
  const gameName = getArcadeGameMeta(gameId)?.name ?? gameId;

  for (const row of rows) {
    if (row.gameId !== gameId) continue;
    if (row.validationStatus !== 'valid') continue;
    if (row.playerStatus === 'suspended') continue;

    const existing = bestByPlayer.get(row.playerId);
    if (!existing) {
      bestByPlayer.set(row.playerId, row);
      continue;
    }

    if (row.score > existing.score) {
      bestByPlayer.set(row.playerId, row);
    } else if (
      row.score === existing.score &&
      new Date(row.playedAt).getTime() < new Date(existing.playedAt).getTime()
    ) {
      bestByPlayer.set(row.playerId, row);
    }
  }

  const sorted = Array.from(bestByPlayer.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime();
  });

  return sorted.map((item, idx) => ({
    rank: idx + 1,
    playerId: item.playerId,
    nickname: item.nickname,
    maskedPhone: maskEthiopianPhone(item.phoneNumberNormalized),
    bestScore: item.score,
    playedAt: item.playedAt,
    gameId,
    gameName,
    isCurrentPlayer: Boolean(currentPlayerId && item.playerId === currentPlayerId),
  }));
}

/**
 * Computes Overall Champion rankings from placement points across eligible games.
 * Never sums raw scores directly.
 */
export function computeOverallChampionStandings(
  rows: RawScoreWithPlayer[],
  eligibleGames: ArcadeGameId[],
  currentPlayerId?: string | null
): {
  overall: OverallChampionEntry[];
  perGame: Record<string, LeaderboardEntry[]>;
} {
  const perGame: Record<string, LeaderboardEntry[]> = {};
  const playerTotals = new Map<
    string,
    {
      playerId: string;
      nickname: string;
      maskedPhone: string;
      totalPoints: number;
      firstPlaceWins: number;
      earliestPlayedAtMs: number;
      breakdown: OverallGameBreakdown[];
    }
  >();

  for (const gameId of eligibleGames) {
    const entries = rankGameScores(rows, gameId, currentPlayerId);
    perGame[gameId] = entries;

    for (const entry of entries) {
      const pts = getPlacementPoints(entry.rank);
      const existing = playerTotals.get(entry.playerId);
      const entryPlayedMs = new Date(entry.playedAt).getTime();
      const breakdownItem: OverallGameBreakdown = {
        gameId: entry.gameId,
        gameName: entry.gameName,
        rank: entry.rank,
        bestScore: entry.bestScore,
        points: pts,
        playedAt: entry.playedAt,
      };

      if (!existing) {
        playerTotals.set(entry.playerId, {
          playerId: entry.playerId,
          nickname: entry.nickname,
          maskedPhone: entry.maskedPhone,
          totalPoints: pts,
          firstPlaceWins: entry.rank === 1 ? 1 : 0,
          earliestPlayedAtMs: entryPlayedMs,
          breakdown: [breakdownItem],
        });
      } else {
        existing.totalPoints += pts;
        if (entry.rank === 1) existing.firstPlaceWins += 1;
        if (entryPlayedMs < existing.earliestPlayedAtMs) {
          existing.earliestPlayedAtMs = entryPlayedMs;
        }
        existing.breakdown.push(breakdownItem);
      }
    }
  }

  const sortedOverall = Array.from(playerTotals.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.firstPlaceWins !== a.firstPlaceWins) {
      return b.firstPlaceWins - a.firstPlaceWins;
    }
    return a.earliestPlayedAtMs - b.earliestPlayedAtMs;
  });

  const overall: OverallChampionEntry[] = sortedOverall.map((item, idx) => ({
    rank: idx + 1,
    playerId: item.playerId,
    nickname: item.nickname,
    maskedPhone: item.maskedPhone,
    totalPoints: item.totalPoints,
    firstPlaceWins: item.firstPlaceWins,
    breakdown: item.breakdown,
    isCurrentPlayer: Boolean(currentPlayerId && item.playerId === currentPlayerId),
  }));

  return { overall, perGame };
}

// ---------------------------------------------------------------------------
// Arcade Game & Session UUID Helpers (Synced to live Supabase schema)
// ---------------------------------------------------------------------------
interface ArcadeGamesContext {
  byFrontendId: Map<ArcadeGameId, string>;
  byUuid: Map<string, ArcadeGameId>;
}

async function loadArcadeGamesContext(
  client: SupabaseClient
): Promise<ArcadeGamesContext> {
  const { data, error } = await client
    .from('arcade_games')
    .select('id, code')
    .order('sort_order', { ascending: true });

  if (error) {
    throw mapArcadeDbError('loading arcade games catalog', error);
  }

  const byFrontendId = new Map<ArcadeGameId, string>();
  const byUuid = new Map<string, ArcadeGameId>();

  for (const row of data ?? []) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const uuid = typeof r.id === 'string' ? r.id : '';
    const code = typeof r.code === 'string' ? r.code : '';
    if (!uuid || !code) continue;
    const frontendId = fromDbGameCode(code);
    if (frontendId) {
      byFrontendId.set(frontendId, uuid);
      byUuid.set(uuid, frontendId);
    }
  }

  return { byFrontendId, byUuid };
}

function resolveGameUuid(
  ctx: ArcadeGamesContext,
  gameId: string
): string | null {
  const meta = getArcadeGameMeta(gameId);
  if (!meta) return null;
  return ctx.byFrontendId.get(meta.id) ?? null;
}

function normalizeSessionUuid(rawSessionId: string): string {
  const trimmed = rawSessionId.trim();
  if (isValidUuid(trimmed)) {
    return trimmed.toLowerCase();
  }
  const hash = crypto.createHash('sha256').update(trimmed).digest();
  hash[6] = (hash[6] & 0x0f) | 0x40;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function toFrontendValidationStatus(raw: unknown): ScoreValidationStatus {
  if (raw === 'valid') return 'valid';
  if (raw === 'rejected') return 'rejected';
  if (raw === 'pending' || raw === 'flagged') return 'flagged';
  return 'valid';
}

// ---------------------------------------------------------------------------
// Schema Health Check
// ---------------------------------------------------------------------------
export async function getArcadeSchemaStatus(
  overrideClient?: SupabaseClient
): Promise<{
  initialized: boolean;
  tables: Record<string, string>;
}> {
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);
  const tables = [
    'arcade_players',
    'arcade_games',
    'arcade_game_sessions',
    'arcade_competitions',
    'arcade_competition_games',
    'arcade_scores',
    'arcade_winners',
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
  return { initialized, tables: results };
}

// ---------------------------------------------------------------------------
// Row Mappers
// ---------------------------------------------------------------------------
function mapCompetitionRow(
  row: Record<string, unknown>,
  eligibleGames?: ArcadeGameId[]
): ArcadeCompetition {
  const fallbackGames: ArcadeGameId[] = PLAYABLE_GAMES.map((g) => g.id);
  const games =
    eligibleGames && eligibleGames.length > 0 ? eligibleGames : fallbackGames;

  return {
    id: String(row.id),
    name: String(row.name ?? 'POPO Challenge'),
    competitionType:
      row.competition_type === 'weekly' ? 'weekly' : 'daily',
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    timezone: String(row.timezone ?? COMPETITION_TIMEZONE),
    eligibleGames: games,
    prizeDescription: String(row.prize_description ?? ''),
    status: (row.status as CompetitionStatus) ?? 'active',
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapPublicPlayerRow(
  row: Record<string, unknown>,
  bestScores?: Record<string, number>
): PublicArcadePlayer {
  const normalizedPhone = String(
    row.phone_e164 ?? row.phone_number_normalized ?? row.phone_number ?? ''
  );
  return {
    id: String(row.id),
    nickname: String(row.nickname ?? 'Player'),
    maskedPhone: maskEthiopianPhone(normalizedPhone),
    status: (row.status as PlayerStatus) ?? 'active',
    createdAt: String(row.created_at ?? new Date().toISOString()),
    bestScores,
  };
}

// ---------------------------------------------------------------------------
// Player Registration & Profile Endpoints
// ---------------------------------------------------------------------------
export async function registerOrResumeArcadePlayer(
  input: { mode?: unknown; nickname?: unknown; phoneNumber?: unknown },
  overrideClient?: SupabaseClient
): Promise<{ success: true; player: PublicArcadePlayer; returning: boolean }> {
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const rawPhone =
    typeof input.phoneNumber === 'string' ? input.phoneNumber.trim() : '';
  const phoneE164 = normalizeEthiopianPhoneToE164(rawPhone);
  if (!phoneE164) {
    throw new HttpError(
      400,
      'Please enter a valid Ethiopian mobile number (e.g. 0911223344 or +251911223344).'
    );
  }

  const nickname = sanitizeNickname(input.nickname);
  const requestedMode =
    input.mode === 'login'
      ? 'login'
      : input.mode === 'register'
      ? 'register'
      : nickname.length === 0
      ? 'login'
      : 'register';

  const { data: existingRows, error: lookupError } = await client
    .from('arcade_players')
    .select('id, nickname, phone_e164, status, created_at')
    .eq('phone_e164', phoneE164)
    .limit(1);

  if (lookupError) {
    throw mapArcadeDbError('looking up arcade player', lookupError);
  }

  if (existingRows && existingRows.length > 0) {
    const existing = existingRows[0] as Record<string, unknown>;
    if (existing.status === 'suspended') {
      throw new HttpError(
        403,
        'This player profile has been suspended. Please contact support.'
      );
    }

    const gamesCtx = await loadArcadeGamesContext(client);
    const bestScores = await fetchPlayerBestScores(
      client,
      String(existing.id),
      gamesCtx
    );
    return {
      success: true,
      player: mapPublicPlayerRow(existing, bestScores),
      returning: true,
    };
  }

  if (requestedMode === 'login') {
    throw new HttpError(
      404,
      'No arcade profile found for this phone number. Switch to New Player to register.'
    );
  }

  if (nickname.length < 2 || nickname.length > 24) {
    throw new HttpError(
      400,
      'Please enter a nickname between 2 and 24 characters.'
    );
  }

  const { data: insertedRows, error: insertError } = await client
    .from('arcade_players')
    .insert({
      nickname,
      phone_e164: phoneE164,
      status: 'active',
    })
    .select('id, nickname, phone_e164, status, created_at')
    .limit(1);

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: raceRows, error: raceErr } = await client
        .from('arcade_players')
        .select('id, nickname, phone_e164, status, created_at')
        .eq('phone_e164', phoneE164)
        .limit(1);

      if (raceErr) {
        throw mapArcadeDbError('looking up existing arcade player', raceErr);
      }

      if (raceRows && raceRows.length > 0) {
        const existing = raceRows[0] as Record<string, unknown>;
        if (existing.status === 'suspended') {
          throw new HttpError(
            403,
            'This player profile has been suspended. Please contact support.'
          );
        }
        const gamesCtx = await loadArcadeGamesContext(client);
        const bestScores = await fetchPlayerBestScores(
          client,
          String(existing.id),
          gamesCtx
        );
        return {
          success: true,
          player: mapPublicPlayerRow(existing, bestScores),
          returning: true,
        };
      }
    }
    throw mapArcadeDbError('creating arcade player profile', insertError);
  }

  if (!insertedRows || insertedRows.length === 0) {
    throw new HttpError(502, 'Failed to create player profile.');
  }

  return {
    success: true,
    player: mapPublicPlayerRow(insertedRows[0] as Record<string, unknown>, {}),
    returning: false,
  };
}

async function fetchPlayerBestScores(
  client: SupabaseClient,
  playerId: string,
  gamesCtx?: ArcadeGamesContext
): Promise<Record<string, number>> {
  const ctx = gamesCtx ?? (await loadArcadeGamesContext(client));
  const { data, error } = await client
    .from('arcade_scores')
    .select('game_id, score')
    .eq('player_id', playerId)
    .eq('validation_status', 'valid');

  if (error) {
    throw mapArcadeDbError('loading player best scores', error);
  }

  const best: Record<string, number> = {};
  for (const row of data ?? []) {
    const rawGameUuid = String((row as Record<string, unknown>).game_id ?? '');
    const frontendId = ctx.byUuid.get(rawGameUuid);
    if (!frontendId) continue;
    const sc = Number((row as Record<string, unknown>).score ?? 0);
    if (!Number.isFinite(sc) || sc < 0) continue;
    if (best[frontendId] === undefined || sc > best[frontendId]) {
      best[frontendId] = sc;
    }
  }
  return best;
}

export async function fetchPublicArcadePlayer(
  playerId: string,
  overrideClient?: SupabaseClient
): Promise<PublicArcadePlayer | null> {
  if (!isValidUuid(playerId)) return null;
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const { data, error } = await client
    .from('arcade_players')
    .select('id, nickname, phone_e164, status, created_at')
    .eq('id', playerId)
    .limit(1);

  if (error) {
    throw mapArcadeDbError('fetching player profile', error);
  }
  if (!data || data.length === 0 || !data[0]) return null;

  const gamesCtx = await loadArcadeGamesContext(client);
  const bestScores = await fetchPlayerBestScores(client, playerId, gamesCtx);
  return mapPublicPlayerRow(data[0] as Record<string, unknown>, bestScores);
}

// ---------------------------------------------------------------------------
// Score Submission Endpoint
// ---------------------------------------------------------------------------
export async function submitArcadeScore(
  body: {
    playerId?: unknown;
    gameId?: unknown;
    score?: unknown;
    sessionId?: unknown;
    durationMs?: unknown;
    metadata?: unknown;
  },
  overrideClient?: SupabaseClient
): Promise<{
  scoreRecord: {
    id: string;
    gameId: ArcadeGameId;
    score: number;
    validationStatus: ScoreValidationStatus;
    playedAt: string;
    isNewPersonalBest: boolean;
  };
  bestScores: Record<string, number>;
}> {
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const playerId = typeof body.playerId === 'string' ? body.playerId.trim() : '';
  if (!isValidUuid(playerId)) {
    throw new HttpError(400, 'A valid registered player ID is required.');
  }

  const rawGameId = typeof body.gameId === 'string' ? body.gameId.trim() : '';
  const meta = getArcadeGameMeta(rawGameId);
  const frontendGameId = meta?.id ?? rawGameId;
  const rawSessionId =
    typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (rawSessionId.length < 8 || rawSessionId.length > 128) {
    throw new HttpError(400, 'A valid game session ID is required.');
  }
  const sessionUuid = normalizeSessionUuid(rawSessionId);

  const gamesCtx = await loadArcadeGamesContext(client);
  const gameUuid = resolveGameUuid(gamesCtx, frontendGameId);
  if (!gameUuid) {
    throw new HttpError(
      400,
      `Unknown or unconfigured arcade game (${toDbGameCode(frontendGameId)}).`
    );
  }

  // Lookup player first
  const { data: playerRows, error: playerErr } = await client
    .from('arcade_players')
    .select('id, status')
    .eq('id', playerId)
    .limit(1);

  if (playerErr) {
    throw mapArcadeDbError('verifying player profile', playerErr);
  }
  if (!playerRows || playerRows.length === 0 || !playerRows[0]) {
    throw new HttpError(404, 'Player profile not found. Please register again.');
  }

  const playerStatus =
    (playerRows[0] as { status?: PlayerStatus }).status ?? 'active';

  // Check duplicate session submission cleanly before rate limit
  const { data: dupRows, error: dupErr } = await client
    .from('arcade_scores')
    .select('id, player_id, game_id, score, validation_status, submitted_at')
    .eq('session_id', sessionUuid)
    .limit(1);

  if (dupErr) {
    throw mapArcadeDbError('checking duplicate score session', dupErr);
  }

  if (dupRows && dupRows.length > 0) {
    const existing = dupRows[0] as Record<string, unknown>;
    if (String(existing.player_id) !== playerId) {
      throw new HttpError(409, 'This session ID has already been claimed.');
    }
    const bestScores = await fetchPlayerBestScores(client, playerId, gamesCtx);
    return {
      scoreRecord: {
        id: String(existing.id),
        gameId: frontendGameId as ArcadeGameId,
        score: Number(existing.score),
        validationStatus: toFrontendValidationStatus(existing.validation_status),
        playedAt: String(existing.submitted_at ?? new Date().toISOString()),
        isNewPersonalBest: false,
      },
      bestScores,
    };
  }

  // Enforce rate limit
  checkPlayerSubmissionRateLimit(playerId);

  // Server-side validation & suspicion checks
  const evaluation = evaluateScoreSubmission({
    gameId: frontendGameId,
    score: body.score,
    durationMs: body.durationMs,
    playerStatus,
  });

  // Check current personal best before insert
  const previousBests = await fetchPlayerBestScores(client, playerId, gamesCtx);
  const prevBestForGame = previousBests[frontendGameId] ?? 0;

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const safeDurationMs =
    typeof evaluation.durationMs === 'number' && evaluation.durationMs > 0
      ? Math.min(evaluation.durationMs, 24 * 60 * 60 * 1000)
      : 0;
  const startedAtIso = new Date(nowMs - safeDurationMs).toISOString();

  // Ensure matching session row exists in arcade_game_sessions (FK target)
  const { data: existingSessionRows, error: sessLookupErr } = await client
    .from('arcade_game_sessions')
    .select('id, player_id')
    .eq('id', sessionUuid)
    .limit(1);

  if (sessLookupErr) {
    throw mapArcadeDbError('checking arcade game session', sessLookupErr);
  }

  if (existingSessionRows && existingSessionRows.length > 0) {
    const sessOwner = String(
      (existingSessionRows[0] as Record<string, unknown>).player_id ?? ''
    );
    if (sessOwner !== playerId) {
      throw new HttpError(409, 'This session ID has already been claimed.');
    }
  } else {
    const { error: sessInsertErr } = await client
      .from('arcade_game_sessions')
      .insert({
        id: sessionUuid,
        player_id: playerId,
        game_id: gameUuid,
        started_at: startedAtIso,
        ended_at: nowIso,
        status: 'completed',
      });

    if (sessInsertErr && sessInsertErr.code !== '23505') {
      throw mapArcadeDbError('recording arcade game session', sessInsertErr);
    }
  }

  // DB check constraint permits 'valid', 'pending', 'rejected'
  const dbValidationStatus =
    evaluation.validationStatus === 'flagged'
      ? 'pending'
      : evaluation.validationStatus;

  const { data: insertedRows, error: insertError } = await client
    .from('arcade_scores')
    .insert({
      player_id: playerId,
      game_id: gameUuid,
      session_id: sessionUuid,
      score: evaluation.score,
      validation_status: dbValidationStatus,
      submitted_at: nowIso,
      review_note: evaluation.validationReason,
    })
    .select('id, game_id, score, validation_status, submitted_at')
    .limit(1);

  if (insertError) {
    if (insertError.code === '23505') {
      throw new HttpError(409, 'Duplicate score submission for this session.');
    }
    throw mapArcadeDbError('saving arcade score', insertError);
  }

  const saved = (insertedRows?.[0] ?? {}) as Record<string, unknown>;
  const bestScores = await fetchPlayerBestScores(client, playerId, gamesCtx);

  return {
    scoreRecord: {
      id: String(saved.id ?? ''),
      gameId: frontendGameId as ArcadeGameId,
      score: evaluation.score,
      validationStatus: toFrontendValidationStatus(
        saved.validation_status ?? dbValidationStatus
      ),
      playedAt: String(saved.submitted_at ?? nowIso),
      isNewPersonalBest:
        dbValidationStatus === 'valid' && evaluation.score > prevBestForGame,
    },
    bestScores,
  };
}

// ---------------------------------------------------------------------------
// Public Leaderboards & Active Competitions
// ---------------------------------------------------------------------------
async function queryValidScoresInWindow(
  client: SupabaseClient,
  gamesCtx: ArcadeGamesContext,
  options: { startsAt?: string; endsAt?: string; gameIds?: ArcadeGameId[] }
): Promise<RawScoreWithPlayer[]> {
  let query = client
    .from('arcade_scores')
    .select(
      'id, player_id, game_id, score, submitted_at, validation_status, arcade_players!inner(nickname, phone_e164, status)'
    )
    .eq('validation_status', 'valid');

  if (options.startsAt) {
    query = query.gte('submitted_at', options.startsAt);
  }
  if (options.endsAt) {
    query = query.lt('submitted_at', options.endsAt);
  }
  if (options.gameIds && options.gameIds.length > 0) {
    const targetUuids = options.gameIds
      .map((gid) => resolveGameUuid(gamesCtx, gid))
      .filter((id): id is string => Boolean(id));
    if (targetUuids.length === 0) {
      return [];
    }
    query = query.in('game_id', targetUuids);
  }

  const { data, error } = await query
    .order('score', { ascending: false })
    .order('submitted_at', { ascending: true })
    .limit(2000);

  if (error) {
    throw mapArcadeDbError('querying arcade leaderboard scores', error);
  }

  const mapped: RawScoreWithPlayer[] = [];
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const frontendGameId = gamesCtx.byUuid.get(String(r.game_id ?? ''));
    if (!frontendGameId) continue;

    const playerRaw = Array.isArray(r.arcade_players)
      ? (r.arcade_players[0] as Record<string, unknown> | undefined)
      : (r.arcade_players as Record<string, unknown> | undefined);

    if (!playerRaw) continue;
    mapped.push({
      id: String(r.id),
      playerId: String(r.player_id),
      nickname: String(playerRaw.nickname ?? 'Player'),
      phoneNumberNormalized: String(playerRaw.phone_e164 ?? ''),
      playerStatus: (playerRaw.status as PlayerStatus) ?? 'active',
      gameId: frontendGameId,
      score: Number(r.score ?? 0),
      playedAt: String(r.submitted_at ?? ''),
      validationStatus: toFrontendValidationStatus(r.validation_status),
    });
  }
  return mapped;
}

async function loadCompetitionGamesMap(
  client: SupabaseClient,
  competitionIds: string[],
  gamesCtx: ArcadeGamesContext
): Promise<Map<string, ArcadeGameId[]>> {
  const result = new Map<string, ArcadeGameId[]>();
  if (competitionIds.length === 0) return result;

  const { data, error } = await client
    .from('arcade_competition_games')
    .select('competition_id, game_id')
    .in('competition_id', competitionIds);

  if (error) {
    throw mapArcadeDbError('loading competition eligible games', error);
  }

  for (const row of data ?? []) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const compId = typeof r.competition_id === 'string' ? r.competition_id : '';
    const gameId = gamesCtx.byUuid.get(String(r.game_id ?? ''));
    if (!compId || !gameId) continue;
    const list = result.get(compId) ?? [];
    if (!list.includes(gameId)) list.push(gameId);
    result.set(compId, list);
  }

  return result;
}

export async function fetchPublicCompetitionsOverview(
  currentPlayerId?: string | null,
  overrideClient?: SupabaseClient
): Promise<{
  dailyCompetition: ArcadeCompetition | null;
  weeklyCompetition: ArcadeCompetition | null;
  dailyFallbackWindow: { startsAt: string; endsAt: string; label: string };
  weeklyFallbackWindow: { startsAt: string; endsAt: string; label: string };
  recentCompleted: Array<{
    competition: ArcadeCompetition;
    winners: Array<{
      id: string;
      winnerType: 'overall' | 'per_game';
      gameId: ArcadeGameId | null;
      gameName: string | null;
      rank: number;
      nickname: string;
      maskedPhone: string;
      finalScore: number;
      competitionPoints: number;
      approvalStatus: WinnerApprovalStatus;
      prizeStatus: PrizeStatus;
    }>;
  }>;
  overallStandings: {
    daily: OverallChampionEntry[];
    weekly: OverallChampionEntry[];
    allTime: OverallChampionEntry[];
  };
}> {
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const now = new Date();
  const nowIso = now.toISOString();
  const dailyFallbackWindow = getAddisAbabaDailyWindow(now);
  const weeklyFallbackWindow = getAddisAbabaWeeklyWindow(now);

  const [gamesCtx, compRes] = await Promise.all([
    loadArcadeGamesContext(client),
    client
      .from('arcade_competitions')
      .select('*')
      .in('status', ['active', 'upcoming', 'completed'])
      .order('starts_at', { ascending: false })
      .limit(40),
  ]);

  if (compRes.error) {
    throw mapArcadeDbError('loading competitions', compRes.error);
  }

  const rawComps = (compRes.data ?? []).filter(
    (r): r is Record<string, unknown> => Boolean(r && typeof r === 'object')
  );
  const compIds = rawComps.map((r) => String(r.id));
  const compGamesMap = await loadCompetitionGamesMap(client, compIds, gamesCtx);

  const allComps = rawComps.map((row) =>
    mapCompetitionRow(row, compGamesMap.get(String(row.id)))
  );

  const dailyCompetition =
    allComps.find(
      (c) =>
        c.competitionType === 'daily' &&
        c.status === 'active' &&
        c.startsAt <= nowIso &&
        c.endsAt > nowIso
    ) ??
    allComps.find((c) => c.competitionType === 'daily' && c.status === 'active') ??
    null;

  const weeklyCompetition =
    allComps.find(
      (c) =>
        c.competitionType === 'weekly' &&
        c.status === 'active' &&
        c.startsAt <= nowIso &&
        c.endsAt > nowIso
    ) ??
    allComps.find((c) => c.competitionType === 'weekly' && c.status === 'active') ??
    null;

  const allPlayableGameIds: ArcadeGameId[] = PLAYABLE_GAMES.map((g) => g.id);
  const dailyStart = dailyCompetition?.startsAt ?? dailyFallbackWindow.startsAt;
  const dailyEnd = dailyCompetition?.endsAt ?? dailyFallbackWindow.endsAt;
  const dailyGames = dailyCompetition?.eligibleGames ?? allPlayableGameIds;

  const weeklyStart = weeklyCompetition?.startsAt ?? weeklyFallbackWindow.startsAt;
  const weeklyEnd = weeklyCompetition?.endsAt ?? weeklyFallbackWindow.endsAt;
  const weeklyGames = weeklyCompetition?.eligibleGames ?? allPlayableGameIds;

  const [dailyScores, weeklyScores, allTimeScores] = await Promise.all([
    queryValidScoresInWindow(client, gamesCtx, {
      startsAt: dailyStart,
      endsAt: dailyEnd,
      gameIds: dailyGames,
    }),
    queryValidScoresInWindow(client, gamesCtx, {
      startsAt: weeklyStart,
      endsAt: weeklyEnd,
      gameIds: weeklyGames,
    }),
    queryValidScoresInWindow(client, gamesCtx, {
      gameIds: allPlayableGameIds,
    }),
  ]);

  const dailyOverall = computeOverallChampionStandings(
    dailyScores,
    dailyGames,
    currentPlayerId
  ).overall;
  const weeklyOverall = computeOverallChampionStandings(
    weeklyScores,
    weeklyGames,
    currentPlayerId
  ).overall;
  const allTimeOverall = computeOverallChampionStandings(
    allTimeScores,
    allPlayableGameIds,
    currentPlayerId
  ).overall;

  // Completed competition approved winners (safe masked public view)
  const completedComps = allComps
    .filter((c) => c.status === 'completed' || c.endsAt <= nowIso)
    .slice(0, 8);

  const recentCompleted: Array<{
    competition: ArcadeCompetition;
    winners: Array<{
      id: string;
      winnerType: 'overall' | 'per_game';
      gameId: ArcadeGameId | null;
      gameName: string | null;
      rank: number;
      nickname: string;
      maskedPhone: string;
      finalScore: number;
      competitionPoints: number;
      approvalStatus: WinnerApprovalStatus;
      prizeStatus: PrizeStatus;
    }>;
  }> = [];

  if (completedComps.length > 0) {
    const completedIds = completedComps.map((c) => c.id);
    const { data: winnerRows, error: winErr } = await client
      .from('arcade_winners')
      .select(
        'id, competition_id, winner_type, game_id, final_score, competition_points, approval_status, prize_status, arcade_players!inner(nickname, phone_e164)'
      )
      .in('competition_id', completedIds)
      .eq('approval_status', 'approved')
      .order('competition_points', { ascending: false })
      .order('final_score', { ascending: false });

    if (winErr) {
      throw mapArcadeDbError('loading approved past winners', winErr);
    }

    for (const comp of completedComps) {
      const compWinners = (winnerRows ?? [])
        .filter((w) => {
          if (!w || typeof w !== 'object') return false;
          return String((w as Record<string, unknown>).competition_id) === comp.id;
        })
        .map((w, idx) => {
          const wr = w as Record<string, unknown>;
          const pr = Array.isArray(wr.arcade_players)
            ? ((wr.arcade_players[0] as Record<string, unknown> | null | undefined) ?? null)
            : ((wr.arcade_players as Record<string, unknown> | null | undefined) ?? null);
          const gid =
            typeof wr.game_id === 'string'
              ? gamesCtx.byUuid.get(wr.game_id) ?? null
              : null;
          return {
            id: String(wr.id),
            winnerType: (wr.winner_type as 'overall' | 'per_game') ?? 'overall',
            gameId: gid,
            gameName: gid ? getArcadeGameMeta(gid)?.name ?? gid : null,
            rank: idx + 1,
            nickname: String(pr?.nickname ?? 'Player'),
            maskedPhone: maskEthiopianPhone(String(pr?.phone_e164 ?? '')),
            finalScore: Number(wr.final_score ?? 0),
            competitionPoints: Number(wr.competition_points ?? 0),
            approvalStatus: (wr.approval_status as WinnerApprovalStatus) ?? 'pending',
            prizeStatus: (wr.prize_status as PrizeStatus) ?? 'unclaimed',
          };
        });

      recentCompleted.push({
        competition: comp,
        winners: compWinners,
      });
    }
  }

  return {
    dailyCompetition,
    weeklyCompetition,
    dailyFallbackWindow,
    weeklyFallbackWindow,
    recentCompleted,
    overallStandings: {
      daily: dailyOverall,
      weekly: weeklyOverall,
      allTime: allTimeOverall,
    },
  };
}

export async function fetchPublicLeaderboard(
  params: {
    gameId: string;
    period: LeaderboardPeriod;
    playerId?: string | null;
    competitionId?: string | null;
  },
  overrideClient?: SupabaseClient
): Promise<{
  gameId: string;
  gameName: string;
  period: LeaderboardPeriod;
  periodLabel: string;
  startsAt: string | null;
  endsAt: string | null;
  competition: ArcadeCompetition | null;
  entries: LeaderboardEntry[];
  overallEntries: OverallChampionEntry[];
  currentPlayerRank: number | null;
}> {
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const gamesCtx = await loadArcadeGamesContext(client);
  const now = new Date();
  const nowIso = now.toISOString();
  const dailyWindow = getAddisAbabaDailyWindow(now);
  const weeklyWindow = getAddisAbabaWeeklyWindow(now);

  let competition: ArcadeCompetition | null = null;
  let startsAt: string | null = null;
  let endsAt: string | null = null;
  let periodLabel = 'All-Time';

  if (params.competitionId && isValidUuid(params.competitionId)) {
    const { data, error } = await client
      .from('arcade_competitions')
      .select('*')
      .eq('id', params.competitionId)
      .limit(1);
    if (error) throw mapArcadeDbError('loading competition', error);
    if (data && data.length > 0 && data[0]) {
      const row = data[0] as Record<string, unknown>;
      const gamesMap = await loadCompetitionGamesMap(
        client,
        [String(row.id)],
        gamesCtx
      );
      competition = mapCompetitionRow(row, gamesMap.get(String(row.id)));
      startsAt = competition.startsAt;
      endsAt = competition.endsAt;
      periodLabel = competition.name;
    }
  } else if (params.period === 'daily') {
    const { data, error } = await client
      .from('arcade_competitions')
      .select('*')
      .eq('competition_type', 'daily')
      .eq('status', 'active')
      .lte('starts_at', nowIso)
      .gt('ends_at', nowIso)
      .order('starts_at', { ascending: false })
      .limit(1);

    if (error) throw mapArcadeDbError('loading daily competition', error);

    if (data && data.length > 0 && data[0]) {
      const row = data[0] as Record<string, unknown>;
      const gamesMap = await loadCompetitionGamesMap(
        client,
        [String(row.id)],
        gamesCtx
      );
      competition = mapCompetitionRow(row, gamesMap.get(String(row.id)));
      startsAt = competition.startsAt;
      endsAt = competition.endsAt;
      periodLabel = competition.name;
    } else {
      startsAt = dailyWindow.startsAt;
      endsAt = dailyWindow.endsAt;
      periodLabel = dailyWindow.label;
    }
  } else if (params.period === 'weekly') {
    const { data, error } = await client
      .from('arcade_competitions')
      .select('*')
      .eq('competition_type', 'weekly')
      .eq('status', 'active')
      .lte('starts_at', nowIso)
      .gt('ends_at', nowIso)
      .order('starts_at', { ascending: false })
      .limit(1);

    if (error) throw mapArcadeDbError('loading weekly competition', error);

    if (data && data.length > 0 && data[0]) {
      const row = data[0] as Record<string, unknown>;
      const gamesMap = await loadCompetitionGamesMap(
        client,
        [String(row.id)],
        gamesCtx
      );
      competition = mapCompetitionRow(row, gamesMap.get(String(row.id)));
      startsAt = competition.startsAt;
      endsAt = competition.endsAt;
      periodLabel = competition.name;
    } else {
      startsAt = weeklyWindow.startsAt;
      endsAt = weeklyWindow.endsAt;
      periodLabel = weeklyWindow.label;
    }
  }

  if (params.gameId === 'overall') {
    const eligibleGames: ArcadeGameId[] =
      competition?.eligibleGames ?? PLAYABLE_GAMES.map((g) => g.id);
    const rawScores = await queryValidScoresInWindow(client, gamesCtx, {
      startsAt: startsAt ?? undefined,
      endsAt: endsAt ?? undefined,
      gameIds: eligibleGames,
    });
    const standings = computeOverallChampionStandings(
      rawScores,
      eligibleGames,
      params.playerId
    );
    const current = standings.overall.find((item) => item.isCurrentPlayer);
    return {
      gameId: 'overall',
      gameName: 'Overall Champion',
      period: params.period,
      periodLabel,
      startsAt,
      endsAt,
      competition,
      entries: [],
      overallEntries: standings.overall,
      currentPlayerRank: current?.rank ?? null,
    };
  }

  const meta = getArcadeGameMeta(params.gameId);
  if (!meta) {
    throw new HttpError(400, 'Invalid game leaderboard requested.');
  }

  const rawScores = await queryValidScoresInWindow(client, gamesCtx, {
    startsAt: startsAt ?? undefined,
    endsAt: endsAt ?? undefined,
    gameIds: [meta.id],
  });

  const entries = rankGameScores(rawScores, meta.id, params.playerId);
  const current = entries.find((item) => item.isCurrentPlayer);

  return {
    gameId: meta.id,
    gameName: meta.name,
    period: params.period,
    periodLabel,
    startsAt,
    endsAt,
    competition,
    entries,
    overallEntries: [],
    currentPlayerRank: current?.rank ?? null,
  };
}


