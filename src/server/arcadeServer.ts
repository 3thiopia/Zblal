import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ARCADE_GAMES,
  COMPETITION_TIMEZONE,
  PLAYABLE_GAMES,
  formatAddisAbabaDayLabel,
  getAddisAbabaDailyWindow,
  getAddisAbabaDateRange,
  getAddisAbabaWeeklyWindow,
  getArcadeGameMeta,
  getPlacementPoints,
  isPlayableGameId,
  type AdminWinnerRecord,
  type ArcadeCompetition,
  type ArcadeGameId,
  type CompetitionStatus,
  type CompetitionType,
  type DateRangePreset,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type OverallChampionEntry,
  type OverallGameBreakdown,
  type PlayerStatus,
  type PrizeStatus,
  type PublicArcadePlayer,
  type ScoreValidationStatus,
  type WinnerApprovalStatus,
  type WinnerAuditLogRecord,
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
      validationReason: 'Player account is flagged for manual admin review.',
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
// Row Mappers
// ---------------------------------------------------------------------------
function mapCompetitionRow(row: Record<string, unknown>): ArcadeCompetition {
  const rawGames = Array.isArray(row.eligible_games)
    ? row.eligible_games.filter((g): g is ArcadeGameId => typeof g === 'string')
    : (['poop-man', 'toilet-basketball'] as ArcadeGameId[]);

  return {
    id: String(row.id),
    name: String(row.name ?? 'POPO Challenge'),
    competitionType:
      row.competition_type === 'weekly' ? 'weekly' : 'daily',
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    timezone: String(row.timezone ?? COMPETITION_TIMEZONE),
    eligibleGames: rawGames.length > 0 ? rawGames : ['poop-man', 'toilet-basketball'],
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
    row.phone_number_normalized ?? row.phone_number ?? ''
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
  input: { nickname?: unknown; phoneNumber?: unknown },
  overrideClient?: SupabaseClient
): Promise<{ player: PublicArcadePlayer; returning: boolean }> {
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const nickname = sanitizeNickname(input.nickname);
  if (nickname.length < 2 || nickname.length > 24) {
    throw new HttpError(
      400,
      'Please enter a nickname between 2 and 24 characters.'
    );
  }

  const rawPhone =
    typeof input.phoneNumber === 'string' ? input.phoneNumber.trim() : '';
  const phoneNormalized = normalizeEthiopianPhoneToE164(rawPhone);
  if (!phoneNormalized) {
    throw new HttpError(
      400,
      'Please enter a valid Ethiopian mobile number (e.g. 0911223344 or +251911223344).'
    );
  }

  const { data: existingRows, error: lookupError } = await client
    .from('arcade_players')
    .select('id, nickname, phone_number_normalized, status, created_at')
    .eq('phone_number_normalized', phoneNormalized)
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

    const existingNickname = String(existing.nickname ?? '').trim();
    if (existingNickname.toLowerCase() !== nickname.toLowerCase()) {
      throw new HttpError(
        409,
        'A player profile already exists for this phone number. Please enter your original nickname to continue.'
      );
    }

    const bestScores = await fetchPlayerBestScores(client, String(existing.id));
    return {
      player: mapPublicPlayerRow(existing, bestScores),
      returning: true,
    };
  }

  const { data: insertedRows, error: insertError } = await client
    .from('arcade_players')
    .insert({
      nickname,
      phone_number: rawPhone || phoneNormalized,
      phone_number_normalized: phoneNormalized,
      status: 'active',
    })
    .select('id, nickname, phone_number_normalized, status, created_at')
    .limit(1);

  if (insertError) {
    if (insertError.code === '23505') {
      throw new HttpError(
        409,
        'A player profile with this phone number already exists. Please use your existing nickname.'
      );
    }
    throw mapArcadeDbError('creating arcade player profile', insertError);
  }

  if (!insertedRows || insertedRows.length === 0) {
    throw new HttpError(502, 'Failed to create player profile.');
  }

  return {
    player: mapPublicPlayerRow(insertedRows[0] as Record<string, unknown>, {}),
    returning: false,
  };
}

async function fetchPlayerBestScores(
  client: SupabaseClient,
  playerId: string
): Promise<Record<string, number>> {
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
    const gid = String((row as Record<string, unknown>).game_id);
    const sc = Number((row as Record<string, unknown>).score ?? 0);
    if (!best[gid] || sc > best[gid]) {
      best[gid] = sc;
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
    .select('id, nickname, phone_number_normalized, status, created_at')
    .eq('id', playerId)
    .limit(1);

  if (error) {
    throw mapArcadeDbError('fetching player profile', error);
  }
  if (!data || data.length === 0 || !data[0]) return null;

  const bestScores = await fetchPlayerBestScores(client, playerId);
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

  const gameId = typeof body.gameId === 'string' ? body.gameId.trim() : '';
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (sessionId.length < 8 || sessionId.length > 128) {
    throw new HttpError(400, 'A valid game session ID is required.');
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
    .select('id, player_id, game_id, score, validation_status, played_at')
    .eq('game_id', gameId)
    .eq('session_id', sessionId)
    .limit(1);

  if (dupErr) {
    throw mapArcadeDbError('checking duplicate score session', dupErr);
  }

  if (dupRows && dupRows.length > 0) {
    const existing = dupRows[0] as Record<string, unknown>;
    if (String(existing.player_id) !== playerId) {
      throw new HttpError(409, 'This session ID has already been claimed.');
    }
    const bestScores = await fetchPlayerBestScores(client, playerId);
    return {
      scoreRecord: {
        id: String(existing.id),
        gameId: String(existing.game_id) as ArcadeGameId,
        score: Number(existing.score),
        validationStatus: existing.validation_status as ScoreValidationStatus,
        playedAt: String(existing.played_at),
        isNewPersonalBest: false,
      },
      bestScores,
    };
  }

  // Enforce rate limit
  checkPlayerSubmissionRateLimit(playerId);

  // Server-side validation & suspicion checks
  const evaluation = evaluateScoreSubmission({
    gameId,
    score: body.score,
    durationMs: body.durationMs,
    playerStatus,
  });

  // Check current personal best before insert
  const previousBests = await fetchPlayerBestScores(client, playerId);
  const prevBestForGame = previousBests[gameId] ?? 0;

  // Associate primary active competition if one exists right now for this game
  const nowIso = new Date().toISOString();
  const { data: activeComps } = await client
    .from('arcade_competitions')
    .select('id, eligible_games')
    .eq('status', 'active')
    .lte('starts_at', nowIso)
    .gt('ends_at', nowIso)
    .order('competition_type', { ascending: true });

  const matchedComp = (activeComps ?? []).find((c) => {
    const games = (c as { eligible_games?: unknown }).eligible_games;
    return Array.isArray(games) && games.includes(gameId);
  }) as { id?: string } | undefined;

  const safeMetadata =
    body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? body.metadata
      : {};

  const { data: insertedRows, error: insertError } = await client
    .from('arcade_scores')
    .insert({
      player_id: playerId,
      game_id: gameId,
      score: evaluation.score,
      played_at: nowIso,
      competition_id: matchedComp?.id ?? null,
      validation_status: evaluation.validationStatus,
      validation_reason: evaluation.validationReason,
      session_id: sessionId,
      duration_ms: evaluation.durationMs,
      metadata: safeMetadata,
    })
    .select('id, game_id, score, validation_status, played_at')
    .limit(1);

  if (insertError) {
    if (insertError.code === '23505') {
      throw new HttpError(409, 'Duplicate score submission for this session.');
    }
    throw mapArcadeDbError('saving arcade score', insertError);
  }

  const saved = (insertedRows?.[0] ?? {}) as Record<string, unknown>;
  const bestScores = await fetchPlayerBestScores(client, playerId);

  return {
    scoreRecord: {
      id: String(saved.id ?? ''),
      gameId: gameId as ArcadeGameId,
      score: evaluation.score,
      validationStatus: evaluation.validationStatus,
      playedAt: String(saved.played_at ?? nowIso),
      isNewPersonalBest:
        evaluation.validationStatus === 'valid' && evaluation.score > prevBestForGame,
    },
    bestScores,
  };
}

// ---------------------------------------------------------------------------
// Public Leaderboards & Active Competitions
// ---------------------------------------------------------------------------
async function queryValidScoresInWindow(
  client: SupabaseClient,
  options: { startsAt?: string; endsAt?: string; gameIds?: ArcadeGameId[] }
): Promise<RawScoreWithPlayer[]> {
  let query = client
    .from('arcade_scores')
    .select(
      'id, player_id, game_id, score, played_at, validation_status, arcade_players!inner(nickname, phone_number_normalized, status)'
    )
    .eq('validation_status', 'valid');

  if (options.startsAt) {
    query = query.gte('played_at', options.startsAt);
  }
  if (options.endsAt) {
    query = query.lt('played_at', options.endsAt);
  }
  if (options.gameIds && options.gameIds.length > 0) {
    query = query.in('game_id', options.gameIds);
  }

  const { data, error } = await query
    .order('score', { ascending: false })
    .order('played_at', { ascending: true })
    .limit(2000);

  if (error) {
    throw mapArcadeDbError('querying arcade leaderboard scores', error);
  }

  const mapped: RawScoreWithPlayer[] = [];
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const playerRaw = Array.isArray(r.arcade_players)
      ? (r.arcade_players[0] as Record<string, unknown> | undefined)
      : (r.arcade_players as Record<string, unknown> | undefined);

    if (!playerRaw) continue;
    mapped.push({
      id: String(r.id),
      playerId: String(r.player_id),
      nickname: String(playerRaw.nickname ?? 'Player'),
      phoneNumberNormalized: String(playerRaw.phone_number_normalized ?? ''),
      playerStatus: (playerRaw.status as PlayerStatus) ?? 'active',
      gameId: String(r.game_id) as ArcadeGameId,
      score: Number(r.score ?? 0),
      playedAt: String(r.played_at),
      validationStatus: (r.validation_status as ScoreValidationStatus) ?? 'valid',
    });
  }
  return mapped;
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

  const { data: compRows, error: compError } = await client
    .from('arcade_competitions')
    .select('*')
    .in('status', ['active', 'upcoming', 'completed'])
    .order('starts_at', { ascending: false })
    .limit(40);

  if (compError) {
    throw mapArcadeDbError('loading competitions', compError);
  }

  const allComps = (compRows ?? []).map((row) =>
    mapCompetitionRow(row as Record<string, unknown>)
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

  const dailyStart = dailyCompetition?.startsAt ?? dailyFallbackWindow.startsAt;
  const dailyEnd = dailyCompetition?.endsAt ?? dailyFallbackWindow.endsAt;
  const dailyGames = dailyCompetition?.eligibleGames ?? [
    'poop-man',
    'toilet-basketball',
  ];

  const weeklyStart = weeklyCompetition?.startsAt ?? weeklyFallbackWindow.startsAt;
  const weeklyEnd = weeklyCompetition?.endsAt ?? weeklyFallbackWindow.endsAt;
  const weeklyGames = weeklyCompetition?.eligibleGames ?? [
    'poop-man',
    'toilet-basketball',
  ];

  const [dailyScores, weeklyScores, allTimeScores] = await Promise.all([
    queryValidScoresInWindow(client, {
      startsAt: dailyStart,
      endsAt: dailyEnd,
      gameIds: dailyGames,
    }),
    queryValidScoresInWindow(client, {
      startsAt: weeklyStart,
      endsAt: weeklyEnd,
      gameIds: weeklyGames,
    }),
    queryValidScoresInWindow(client, {
      gameIds: ['poop-man', 'toilet-basketball'],
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
    ['poop-man', 'toilet-basketball'],
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
    const compIds = completedComps.map((c) => c.id);
    const { data: winnerRows, error: winErr } = await client
      .from('arcade_winners')
      .select(
        'id, competition_id, winner_type, game_id, rank, final_score, competition_points, approval_status, prize_status, arcade_players!inner(nickname, phone_number_normalized)'
      )
      .in('competition_id', compIds)
      .eq('approval_status', 'approved')
      .order('rank', { ascending: true });

    if (winErr) {
      throw mapArcadeDbError('loading approved past winners', winErr);
    }

    for (const comp of completedComps) {
      const compWinners = (winnerRows ?? [])
        .filter((w) => {
          if (!w || typeof w !== 'object') return false;
          return String((w as Record<string, unknown>).competition_id) === comp.id;
        })
        .map((w) => {
          const wr = w as Record<string, unknown>;
          const pr = Array.isArray(wr.arcade_players)
            ? ((wr.arcade_players[0] as Record<string, unknown> | null | undefined) ?? null)
            : ((wr.arcade_players as Record<string, unknown> | null | undefined) ?? null);
          const gid =
            typeof wr.game_id === 'string' ? (wr.game_id as ArcadeGameId) : null;
          return {
            id: String(wr.id),
            winnerType: (wr.winner_type as 'overall' | 'per_game') ?? 'overall',
            gameId: gid,
            gameName: gid ? getArcadeGameMeta(gid)?.name ?? gid : null,
            rank: Number(wr.rank ?? 1),
            nickname: String(pr?.nickname ?? 'Player'),
            maskedPhone: maskEthiopianPhone(
              String(pr?.phone_number_normalized ?? '')
            ),
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
    if (data && data.length > 0) {
      competition = mapCompetitionRow(data[0] as Record<string, unknown>);
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
      competition = mapCompetitionRow(data[0] as Record<string, unknown>);
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
      competition = mapCompetitionRow(data[0] as Record<string, unknown>);
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
      competition?.eligibleGames ?? ['poop-man', 'toilet-basketball'];
    const rawScores = await queryValidScoresInWindow(client, {
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

  const rawScores = await queryValidScoresInWindow(client, {
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

// ---------------------------------------------------------------------------
// Admin Authentication Helper
// ---------------------------------------------------------------------------
export function getAuthorizedAdminEmails(): string[] {
  const configured = (process.env.ADMIN_EMAILS ?? 'Binyamawiw@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return configured;
}

export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAuthorizedAdminEmails().includes(email.trim().toLowerCase());
}

export function createAdminPasscodeToken(passcode: string): string | null {
  const configured = process.env.ADMIN_PASSCODE?.trim();
  if (!configured || passcode !== configured) return null;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || configured;
  const exp = Date.now() + 12 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `passcode.${payload}.${sig}`;
}

export function verifyAdminPasscodeToken(token: string): boolean {
  if (!token.startsWith('passcode.')) return false;
  const configured = process.env.ADMIN_PASSCODE?.trim();
  if (!configured) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [, payload, sig] = parts;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || configured;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      exp?: number;
      role?: string;
    };
    return parsed.role === 'admin' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Admin: Competitions CRUD
// ---------------------------------------------------------------------------
export async function adminListCompetitions(
  overrideClient?: SupabaseClient
): Promise<ArcadeCompetition[]> {
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const { data, error } = await client
    .from('arcade_competitions')
    .select('*')
    .order('starts_at', { ascending: false })
    .limit(100);

  if (error) throw mapArcadeDbError('listing competitions', error);
  return (data ?? []).map((row) =>
    mapCompetitionRow(row as Record<string, unknown>)
  );
}

export async function adminCreateCompetition(
  body: {
    name?: unknown;
    competitionType?: unknown;
    startsAt?: unknown;
    endsAt?: unknown;
    timezone?: unknown;
    eligibleGames?: unknown;
    prizeDescription?: unknown;
    status?: unknown;
  },
  overrideClient?: SupabaseClient
): Promise<ArcadeCompetition> {
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 3 || name.length > 120) {
    throw new HttpError(400, 'Competition name must be 3 to 120 characters.');
  }

  const competitionType: CompetitionType =
    body.competitionType === 'weekly' ? 'weekly' : 'daily';

  const startsAtDate = new Date(String(body.startsAt ?? ''));
  const endsAtDate = new Date(String(body.endsAt ?? ''));
  if (
    Number.isNaN(startsAtDate.getTime()) ||
    Number.isNaN(endsAtDate.getTime()) ||
    endsAtDate <= startsAtDate
  ) {
    throw new HttpError(400, 'End date/time must be strictly after start date/time.');
  }

  const allowedGames = new Set(ARCADE_GAMES.map((g) => g.id));
  const rawGames = Array.isArray(body.eligibleGames)
    ? body.eligibleGames.filter(
        (g): g is ArcadeGameId => typeof g === 'string' && allowedGames.has(g as ArcadeGameId)
      )
    : [];
  if (rawGames.length === 0) {
    throw new HttpError(400, 'Select at least one eligible game.');
  }

  const statusInput =
    typeof body.status === 'string' ? body.status.trim() : 'active';
  const status: CompetitionStatus =
    statusInput === 'upcoming' ||
    statusInput === 'active' ||
    statusInput === 'completed' ||
    statusInput === 'disabled'
      ? statusInput
      : 'active';

  const prizeDescription =
    typeof body.prizeDescription === 'string' ? body.prizeDescription.trim().slice(0, 500) : '';

  const timezone =
    typeof body.timezone === 'string' && body.timezone.trim()
      ? body.timezone.trim()
      : COMPETITION_TIMEZONE;

  const { data, error } = await client
    .from('arcade_competitions')
    .insert({
      name,
      competition_type: competitionType,
      starts_at: startsAtDate.toISOString(),
      ends_at: endsAtDate.toISOString(),
      timezone,
      eligible_games: rawGames,
      prize_description: prizeDescription,
      status,
    })
    .select('*')
    .limit(1);

  if (error) throw mapArcadeDbError('creating competition', error);
  if (!data || data.length === 0) {
    throw new HttpError(502, 'Failed to create competition.');
  }
  return mapCompetitionRow(data[0] as Record<string, unknown>);
}

export async function adminUpdateCompetition(
  competitionId: string,
  body: {
    name?: unknown;
    startsAt?: unknown;
    endsAt?: unknown;
    eligibleGames?: unknown;
    prizeDescription?: unknown;
    status?: unknown;
  },
  overrideClient?: SupabaseClient
): Promise<ArcadeCompetition> {
  if (!isValidUuid(competitionId)) {
    throw new HttpError(400, 'Invalid competition ID.');
  }
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const patch: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim().length >= 3) {
    patch.name = body.name.trim().slice(0, 120);
  }
  if (typeof body.prizeDescription === 'string') {
    patch.prize_description = body.prizeDescription.trim().slice(0, 500);
  }
  if (
    body.status === 'upcoming' ||
    body.status === 'active' ||
    body.status === 'completed' ||
    body.status === 'disabled'
  ) {
    patch.status = body.status;
  }
  if (Array.isArray(body.eligibleGames) && body.eligibleGames.length > 0) {
    patch.eligible_games = body.eligibleGames;
  }
  if (body.startsAt && body.endsAt) {
    const s = new Date(String(body.startsAt));
    const e = new Date(String(body.endsAt));
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) {
      throw new HttpError(400, 'Invalid competition date range.');
    }
    patch.starts_at = s.toISOString();
    patch.ends_at = e.toISOString();
  }

  const { data, error } = await client
    .from('arcade_competitions')
    .update(patch)
    .eq('id', competitionId)
    .select('*')
    .limit(1);

  if (error) throw mapArcadeDbError('updating competition', error);
  if (!data || data.length === 0) {
    throw new HttpError(404, 'Competition not found.');
  }
  return mapCompetitionRow(data[0] as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Admin: Players & Score Moderation (Includes Private Phone Numbers)
// ---------------------------------------------------------------------------
export interface AdminPlayerSummary {
  id: string;
  nickname: string;
  phoneNumber: string;
  phoneNumberNormalized: string;
  maskedPhone: string;
  status: PlayerStatus;
  createdAt: string;
  lastActivityAt: string;
  totalRuns: number;
  validRuns: number;
  flaggedRuns: number;
  rejectedRuns: number;
  highestScore: number;
  bestScores: Record<string, number>;
}

export interface AdminScoreHistoryItem {
  id: string;
  playerId: string;
  nickname: string;
  phoneNumber: string;
  maskedPhone: string;
  gameId: ArcadeGameId;
  gameName: string;
  score: number;
  playedAt: string;
  competitionId: string | null;
  competitionPeriodLabel: string;
  validationStatus: ScoreValidationStatus;
  validationReason: string | null;
  sessionId: string;
  durationMs: number | null;
}

export async function adminListPlayersAndScores(
  filters: { search?: string; status?: string } = {},
  overrideClient?: SupabaseClient
): Promise<{
  players: AdminPlayerSummary[];
  recentScores: Array<{
    id: string;
    playerId: string;
    nickname: string;
    phoneNumber: string;
    gameId: ArcadeGameId;
    gameName: string;
    score: number;
    playedAt: string;
    validationStatus: ScoreValidationStatus;
    validationReason: string | null;
    sessionId: string;
    durationMs: number | null;
  }>;
}> {
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  let playerQuery = client
    .from('arcade_players')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (
    filters.status === 'active' ||
    filters.status === 'flagged' ||
    filters.status === 'suspended'
  ) {
    playerQuery = playerQuery.eq('status', filters.status);
  }

  const [{ data: playerRows, error: pErr }, { data: scoreRows, error: sErr }] =
    await Promise.all([
      playerQuery,
      client
        .from('arcade_scores')
        .select('id, player_id, game_id, score, played_at, validation_status, validation_reason, session_id, duration_ms, arcade_players!inner(nickname, phone_number_normalized)')
        .order('played_at', { ascending: false })
        .limit(5000),
    ]);

  if (pErr) throw mapArcadeDbError('loading players for admin', pErr);
  if (sErr) throw mapArcadeDbError('loading scores for admin', sErr);

  const statsByPlayer = new Map<
    string,
    {
      totalRuns: number;
      validRuns: number;
      flaggedRuns: number;
      rejectedRuns: number;
      highestScore: number;
      lastActivityAt: string;
      bestScores: Record<string, number>;
    }
  >();

  const recentScores: Array<{
    id: string;
    playerId: string;
    nickname: string;
    phoneNumber: string;
    gameId: ArcadeGameId;
    gameName: string;
    score: number;
    playedAt: string;
    validationStatus: ScoreValidationStatus;
    validationReason: string | null;
    sessionId: string;
    durationMs: number | null;
  }> = [];

  for (const row of scoreRows ?? []) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const pid = String(r.player_id);
    const gid = String(r.game_id) as ArcadeGameId;
    const score = Number(r.score ?? 0);
    const playedAt = String(r.played_at ?? '');
    const vStatus = (r.validation_status as ScoreValidationStatus) ?? 'valid';

    const cur = statsByPlayer.get(pid) ?? {
      totalRuns: 0,
      validRuns: 0,
      flaggedRuns: 0,
      rejectedRuns: 0,
      highestScore: 0,
      lastActivityAt: playedAt,
      bestScores: {},
    };
    cur.totalRuns += 1;
    if (vStatus === 'valid') cur.validRuns += 1;
    else if (vStatus === 'flagged') cur.flaggedRuns += 1;
    else if (vStatus === 'rejected') cur.rejectedRuns += 1;

    if (playedAt && (!cur.lastActivityAt || playedAt > cur.lastActivityAt)) {
      cur.lastActivityAt = playedAt;
    }

    if (vStatus === 'valid') {
      if (score > cur.highestScore) cur.highestScore = score;
      if (!cur.bestScores[gid] || score > cur.bestScores[gid]) {
        cur.bestScores[gid] = score;
      }
    }
    statsByPlayer.set(pid, cur);

    if (recentScores.length < 200) {
      const pInfo = Array.isArray(r.arcade_players)
        ? ((r.arcade_players[0] as Record<string, unknown> | null | undefined) ?? null)
        : ((r.arcade_players as Record<string, unknown> | null | undefined) ?? null);

      recentScores.push({
        id: String(r.id),
        playerId: pid,
        nickname: String(pInfo?.nickname ?? 'Player'),
        phoneNumber: String(pInfo?.phone_number_normalized ?? ''),
        gameId: gid,
        gameName: getArcadeGameMeta(gid)?.name ?? gid,
        score,
        playedAt,
        validationStatus: vStatus,
        validationReason:
          typeof r.validation_reason === 'string' ? r.validation_reason : null,
        sessionId: String(r.session_id ?? ''),
        durationMs: typeof r.duration_ms === 'number' ? r.duration_ms : null,
      });
    }
  }

  const cleanSearch = filters.search?.trim().toLowerCase() ?? '';
  const searchDigits = cleanSearch.replace(/\D/g, '');

  const players: AdminPlayerSummary[] = (playerRows ?? [])
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
    .map((r) => {
      const pid = String(r.id);
      const normalized = String(r.phone_number_normalized ?? '');
      const rawPhone = String(r.phone_number ?? normalized);
      const createdAt = String(r.created_at ?? '');
      const stats = statsByPlayer.get(pid) ?? {
        totalRuns: 0,
        validRuns: 0,
        flaggedRuns: 0,
        rejectedRuns: 0,
        highestScore: 0,
        lastActivityAt: createdAt,
        bestScores: {},
      };
      return {
        id: pid,
        nickname: String(r.nickname ?? 'Player'),
        phoneNumber: rawPhone,
        phoneNumberNormalized: normalized,
        maskedPhone: maskEthiopianPhone(normalized),
        status: (r.status as PlayerStatus) ?? 'active',
        createdAt,
        lastActivityAt: stats.lastActivityAt || createdAt,
        totalRuns: stats.totalRuns,
        validRuns: stats.validRuns,
        flaggedRuns: stats.flaggedRuns,
        rejectedRuns: stats.rejectedRuns,
        highestScore: stats.highestScore,
        bestScores: stats.bestScores,
      };
    })
    .filter((p) => {
      if (!cleanSearch) return true;
      if (p.nickname.toLowerCase().includes(cleanSearch)) return true;
      if (p.phoneNumberNormalized.toLowerCase().includes(cleanSearch)) return true;
      if (p.phoneNumber.toLowerCase().includes(cleanSearch)) return true;
      if (
        searchDigits.length >= 3 &&
        p.phoneNumberNormalized.replace(/\D/g, '').includes(searchDigits)
      ) {
        return true;
      }
      return false;
    });

  return { players, recentScores };
}

export async function adminUpdatePlayerStatus(
  playerId: string,
  status: PlayerStatus,
  overrideClient?: SupabaseClient
) {
  if (!isValidUuid(playerId)) throw new HttpError(400, 'Invalid player ID.');
  if (status !== 'active' && status !== 'flagged' && status !== 'suspended') {
    throw new HttpError(400, 'Invalid player status.');
  }
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const { error } = await client
    .from('arcade_players')
    .update({ status })
    .eq('id', playerId);

  if (error) throw mapArcadeDbError('updating player status', error);
  return { id: playerId, status };
}

export async function adminUpdateScoreValidation(
  scoreId: string,
  validationStatus: ScoreValidationStatus,
  validationReason?: string,
  overrideClient?: SupabaseClient
) {
  if (!isValidUuid(scoreId)) throw new HttpError(400, 'Invalid score ID.');
  if (
    validationStatus !== 'valid' &&
    validationStatus !== 'flagged' &&
    validationStatus !== 'rejected'
  ) {
    throw new HttpError(400, 'Invalid validation status.');
  }
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const { error } = await client
    .from('arcade_scores')
    .update({
      validation_status: validationStatus,
      validation_reason: validationReason?.trim() || null,
    })
    .eq('id', scoreId);

  if (error) throw mapArcadeDbError('updating score validation', error);
  return { id: scoreId, validationStatus };
}

// ---------------------------------------------------------------------------
// Admin: Winner Review, Snapshot & Audit Trail
// ---------------------------------------------------------------------------
export async function adminGetCompetitionStandingsAndWinners(
  competitionId: string,
  overrideClient?: SupabaseClient
): Promise<{
  competition: ArcadeCompetition;
  overallStandings: Array<
    OverallChampionEntry & { phoneNumber: string }
  >;
  perGameStandings: Record<
    string,
    Array<LeaderboardEntry & { phoneNumber: string }>
  >;
  savedWinners: AdminWinnerRecord[];
}> {
  if (!isValidUuid(competitionId)) {
    throw new HttpError(400, 'Invalid competition ID.');
  }
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const { data: compRows, error: compErr } = await client
    .from('arcade_competitions')
    .select('*')
    .eq('id', competitionId)
    .limit(1);

  if (compErr) throw mapArcadeDbError('loading competition details', compErr);
  if (!compRows || compRows.length === 0) {
    throw new HttpError(404, 'Competition not found.');
  }

  const competition = mapCompetitionRow(compRows[0] as Record<string, unknown>);
  const rawScores = await queryValidScoresInWindow(client, {
    startsAt: competition.startsAt,
    endsAt: competition.endsAt,
    gameIds: competition.eligibleGames,
  });

  const phoneLookup = new Map<string, string>();
  for (const r of rawScores) {
    phoneLookup.set(r.playerId, r.phoneNumberNormalized);
  }

  const standings = computeOverallChampionStandings(
    rawScores,
    competition.eligibleGames
  );

  const overallStandings = standings.overall.map((entry) => ({
    ...entry,
    phoneNumber: phoneLookup.get(entry.playerId) ?? '',
  }));

  const perGameStandings: Record<
    string,
    Array<LeaderboardEntry & { phoneNumber: string }>
  > = {};
  for (const [gid, list] of Object.entries(standings.perGame)) {
    perGameStandings[gid] = list.map((entry) => ({
      ...entry,
      phoneNumber: phoneLookup.get(entry.playerId) ?? '',
    }));
  }

  const [{ data: winnerRows, error: winErr }, { data: auditRows, error: audErr }] =
    await Promise.all([
      client
        .from('arcade_winners')
        .select('*, arcade_players!inner(nickname, phone_number_normalized)')
        .eq('competition_id', competitionId)
        .order('winner_type', { ascending: true })
        .order('rank', { ascending: true }),
      client
        .from('arcade_winner_audit_logs')
        .select('*')
        .eq('competition_id', competitionId)
        .order('created_at', { ascending: false }),
    ]);

  if (winErr) throw mapArcadeDbError('loading competition winners', winErr);
  if (audErr) throw mapArcadeDbError('loading winner audit history', audErr);

  const logsByWinner = new Map<string, WinnerAuditLogRecord[]>();
  for (const row of auditRows ?? []) {
    const r = row as Record<string, unknown>;
    const wid = String(r.winner_id);
    const list = logsByWinner.get(wid) ?? [];
    list.push({
      id: String(r.id),
      winnerId: wid,
      competitionId: String(r.competition_id),
      action: String(r.action),
      previousApprovalStatus:
        typeof r.previous_approval_status === 'string'
          ? r.previous_approval_status
          : null,
      newApprovalStatus:
        typeof r.new_approval_status === 'string' ? r.new_approval_status : null,
      previousPrizeStatus:
        typeof r.previous_prize_status === 'string' ? r.previous_prize_status : null,
      newPrizeStatus:
        typeof r.new_prize_status === 'string' ? r.new_prize_status : null,
      adminNote: String(r.admin_note ?? ''),
      actorEmail: String(r.actor_email ?? 'admin'),
      createdAt: String(r.created_at),
    });
    logsByWinner.set(wid, list);
  }

  const savedWinners: AdminWinnerRecord[] = (winnerRows ?? [])
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
    .map((r) => {
    const pInfo = Array.isArray(r.arcade_players)
      ? ((r.arcade_players[0] as Record<string, unknown> | null | undefined) ?? null)
      : ((r.arcade_players as Record<string, unknown> | null | undefined) ?? null);
    const phone = String(pInfo?.phone_number_normalized ?? '');
    const gid = typeof r.game_id === 'string' ? (r.game_id as ArcadeGameId) : null;
    const id = String(r.id);

    return {
      id,
      competitionId: String(r.competition_id),
      playerId: String(r.player_id),
      nickname: String(pInfo?.nickname ?? 'Player'),
      phoneNumber: phone,
      maskedPhone: maskEthiopianPhone(phone),
      gameId: gid,
      gameName: gid ? getArcadeGameMeta(gid)?.name ?? gid : null,
      winnerType: (r.winner_type as 'overall' | 'per_game') ?? 'overall',
      rank: Number(r.rank ?? 1),
      finalScore: Number(r.final_score ?? 0),
      competitionPoints: Number(r.competition_points ?? 0),
      approvalStatus: (r.approval_status as WinnerApprovalStatus) ?? 'pending',
      prizeStatus: (r.prize_status as PrizeStatus) ?? 'unclaimed',
      adminNote: String(r.admin_note ?? ''),
      approvedAt: typeof r.approved_at === 'string' ? r.approved_at : null,
      awardedAt: typeof r.awarded_at === 'string' ? r.awarded_at : null,
      createdAt: String(r.created_at),
      auditLogs: logsByWinner.get(id) ?? [],
    };
  });

  return {
    competition,
    overallStandings,
    perGameStandings,
    savedWinners,
  };
}

/**
 * Generates pending winner candidates for manual admin review (Overall Champion
 * + top winner for each eligible game). Never auto-approves prizes.
 */
export async function adminSnapshotPendingWinners(
  competitionId: string,
  actorEmail: string,
  overrideClient?: SupabaseClient
): Promise<AdminWinnerRecord[]> {
  const details = await adminGetCompetitionStandingsAndWinners(
    competitionId,
    overrideClient
  );
  const client = getServerSupabaseClient(overrideClient);

  const candidates: Array<{
    competition_id: string;
    player_id: string;
    game_id: string | null;
    winner_type: 'overall' | 'per_game';
    rank: number;
    final_score: number;
    competition_points: number;
  }> = [];

  if (details.overallStandings.length > 0) {
    const champ = details.overallStandings[0];
    candidates.push({
      competition_id: competitionId,
      player_id: champ.playerId,
      game_id: null,
      winner_type: 'overall',
      rank: 1,
      final_score: champ.totalPoints,
      competition_points: champ.totalPoints,
    });
  }

  for (const gid of details.competition.eligibleGames) {
    const gameList = details.perGameStandings[gid] ?? [];
    if (gameList.length > 0) {
      const winner = gameList[0];
      candidates.push({
        competition_id: competitionId,
        player_id: winner.playerId,
        game_id: gid,
        winner_type: 'per_game',
        rank: 1,
        final_score: winner.bestScore,
        competition_points: getPlacementPoints(1),
      });
    }
  }

  if (candidates.length === 0) {
    throw new HttpError(
      400,
      'No valid scores exist in this competition window yet.'
    );
  }

  for (const cand of candidates) {
    const existing = details.savedWinners.find(
      (w) =>
        w.winnerType === cand.winner_type &&
        w.playerId === cand.player_id &&
        (w.gameId ?? null) === cand.game_id
    );
    if (existing) {
      continue;
    }

    const { data: inserted, error: insErr } = await client
      .from('arcade_winners')
      .insert({
        ...cand,
        approval_status: 'pending',
        prize_status: 'unclaimed',
        admin_note: '',
      })
      .select('id')
      .limit(1);

    if (insErr) {
      throw mapArcadeDbError('creating pending winner review entry', insErr);
    }

    const winnerId = inserted?.[0]?.id ? String(inserted[0].id) : null;
    if (winnerId) {
      await client.from('arcade_winner_audit_logs').insert({
        winner_id: winnerId,
        competition_id: competitionId,
        action: 'snapshot_created',
        previous_approval_status: null,
        new_approval_status: 'pending',
        previous_prize_status: null,
        new_prize_status: 'unclaimed',
        admin_note: 'Generated candidate for manual review',
        actor_email: actorEmail,
      });
    }
  }

  const refreshed = await adminGetCompetitionStandingsAndWinners(
    competitionId,
    overrideClient
  );
  return refreshed.savedWinners;
}

export async function adminReviewWinner(
  winnerId: string,
  input: {
    approvalStatus?: unknown;
    prizeStatus?: unknown;
    adminNote?: unknown;
  },
  actorEmail: string,
  overrideClient?: SupabaseClient
): Promise<AdminWinnerRecord> {
  if (!isValidUuid(winnerId)) throw new HttpError(400, 'Invalid winner ID.');
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const { data: existingRows, error: fetchErr } = await client
    .from('arcade_winners')
    .select('*')
    .eq('id', winnerId)
    .limit(1);

  if (fetchErr) throw mapArcadeDbError('loading winner record', fetchErr);
  if (!existingRows || existingRows.length === 0) {
    throw new HttpError(404, 'Winner record not found.');
  }

  const current = existingRows[0] as Record<string, unknown>;
  const prevApproval = String(current.approval_status) as WinnerApprovalStatus;
  const prevPrize = String(current.prize_status) as PrizeStatus;

  const nextApproval =
    input.approvalStatus === 'pending' ||
    input.approvalStatus === 'approved' ||
    input.approvalStatus === 'rejected'
      ? input.approvalStatus
      : prevApproval;

  const nextPrize =
    input.prizeStatus === 'unclaimed' ||
    input.prizeStatus === 'contacted' ||
    input.prizeStatus === 'awarded' ||
    input.prizeStatus === 'forfeited'
      ? input.prizeStatus
      : prevPrize;

  if (nextPrize === 'awarded' && nextApproval !== 'approved') {
    throw new HttpError(
      400,
      'Approve the winner after verifying contact details before marking a prize as awarded.'
    );
  }

  const nextNote =
    typeof input.adminNote === 'string'
      ? input.adminNote.trim().slice(0, 1000)
      : String(current.admin_note ?? '');

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = {
    approval_status: nextApproval,
    prize_status: nextPrize,
    admin_note: nextNote,
  };

  if (nextApproval === 'approved' && prevApproval !== 'approved') {
    patch.approved_at = nowIso;
  } else if (nextApproval !== 'approved') {
    patch.approved_at = null;
  }

  if (nextPrize === 'awarded' && prevPrize !== 'awarded') {
    patch.awarded_at = nowIso;
  }

  const { error: updErr } = await client
    .from('arcade_winners')
    .update(patch)
    .eq('id', winnerId);

  if (updErr) throw mapArcadeDbError('updating winner review', updErr);

  const actionParts: string[] = [];
  if (nextApproval !== prevApproval) actionParts.push(`approval:${nextApproval}`);
  if (nextPrize !== prevPrize) actionParts.push(`prize:${nextPrize}`);
  if (nextNote !== String(current.admin_note ?? '')) actionParts.push('note_updated');

  await client.from('arcade_winner_audit_logs').insert({
    winner_id: winnerId,
    competition_id: String(current.competition_id),
    action: actionParts.join(', ') || 'reviewed',
    previous_approval_status: prevApproval,
    new_approval_status: nextApproval,
    previous_prize_status: prevPrize,
    new_prize_status: nextPrize,
    admin_note: nextNote,
    actor_email: actorEmail,
  });

  const compDetails = await adminGetCompetitionStandingsAndWinners(
    String(current.competition_id),
    overrideClient
  );
  const updated = compDetails.savedWinners.find((w) => w.id === winnerId);
  if (!updated) {
    throw new HttpError(404, 'Updated winner record not found.');
  }
  return updated;
}

// ---------------------------------------------------------------------------
// Admin: Overview Metrics, Player Details, All Scores, Daily/Weekly/Overall
// ---------------------------------------------------------------------------
export interface AdminArcadeOverviewResponse {
  totalPlayers: number;
  totalAttempts: number;
  gamesPlayedToday: number;
  uniquePlayersToday: number;
  uniquePlayersThisWeek: number;
  pendingWinnerApprovals: number;
  prizesAwaitingDistribution: number;
  popularGames: Array<{
    gameId: ArcadeGameId;
    gameName: string;
    totalAttempts: number;
    validAttempts: number;
    uniquePlayers: number;
    sharePercent: number;
  }>;
  dailyWindow: { startsAt: string; endsAt: string; label: string };
  weeklyWindow: { startsAt: string; endsAt: string; label: string };
  activeCompetitionsCount: number;
  upcomingCompetitionsCount: number;
}

export async function adminGetArcadeOverview(
  overrideClient?: SupabaseClient
): Promise<AdminArcadeOverviewResponse> {
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const now = new Date();
  const dailyWindow = getAddisAbabaDailyWindow(now);
  const weeklyWindow = getAddisAbabaWeeklyWindow(now);

  const [
    playersCountRes,
    scoresCountRes,
    todayScoresRes,
    weekPlayersRes,
    allScoresRes,
    pendingWinnersRes,
    awaitingPrizesRes,
    compsRes,
  ] = await Promise.all([
    client.from('arcade_players').select('id', { count: 'exact', head: true }),
    client.from('arcade_scores').select('id', { count: 'exact', head: true }),
    client
      .from('arcade_scores')
      .select('player_id')
      .gte('played_at', dailyWindow.startsAt)
      .lt('played_at', dailyWindow.endsAt),
    client
      .from('arcade_scores')
      .select('player_id')
      .gte('played_at', weeklyWindow.startsAt)
      .lt('played_at', weeklyWindow.endsAt),
    client
      .from('arcade_scores')
      .select('game_id, player_id, validation_status')
      .limit(10000),
    client
      .from('arcade_winners')
      .select('id', { count: 'exact', head: true })
      .eq('approval_status', 'pending'),
    client
      .from('arcade_winners')
      .select('id', { count: 'exact', head: true })
      .eq('approval_status', 'approved')
      .in('prize_status', ['unclaimed', 'contacted']),
    client.from('arcade_competitions').select('id, status'),
  ]);

  if (playersCountRes.error) {
    throw mapArcadeDbError('counting arcade players', playersCountRes.error);
  }
  if (scoresCountRes.error) {
    throw mapArcadeDbError('counting arcade scores', scoresCountRes.error);
  }
  if (todayScoresRes.error) {
    throw mapArcadeDbError('loading today arcade scores', todayScoresRes.error);
  }
  if (weekPlayersRes.error) {
    throw mapArcadeDbError('loading weekly arcade players', weekPlayersRes.error);
  }
  if (allScoresRes.error) {
    throw mapArcadeDbError('aggregating popular arcade games', allScoresRes.error);
  }
  if (pendingWinnersRes.error) {
    throw mapArcadeDbError('counting pending winner approvals', pendingWinnersRes.error);
  }
  if (awaitingPrizesRes.error) {
    throw mapArcadeDbError('counting prizes awaiting distribution', awaitingPrizesRes.error);
  }
  if (compsRes.error) {
    throw mapArcadeDbError('counting competitions', compsRes.error);
  }

  const todayRows = (todayScoresRes.data ?? []) as Array<{ player_id?: string }>;
  const todayPlayerSet = new Set(
    todayRows.map((r) => String(r.player_id ?? '')).filter(Boolean)
  );

  const weekRows = (weekPlayersRes.data ?? []) as Array<{ player_id?: string }>;
  const weekPlayerSet = new Set(
    weekRows.map((r) => String(r.player_id ?? '')).filter(Boolean)
  );

  const gameStats = new Map<
    ArcadeGameId,
    { total: number; valid: number; players: Set<string> }
  >();
  let aggregatedTotal = 0;

  for (const row of (allScoresRes.data ?? []) as Array<Record<string, unknown>>) {
    const gid = String(row.game_id ?? '') as ArcadeGameId;
    if (!gid) continue;
    aggregatedTotal += 1;
    const cur = gameStats.get(gid) ?? { total: 0, valid: 0, players: new Set<string>() };
    cur.total += 1;
    if (row.validation_status === 'valid') cur.valid += 1;
    if (typeof row.player_id === 'string') cur.players.add(row.player_id);
    gameStats.set(gid, cur);
  }

  const denom = Math.max(1, aggregatedTotal);
  const popularGames = Array.from(gameStats.entries())
    .map(([gameId, stats]) => ({
      gameId,
      gameName: getArcadeGameMeta(gameId)?.name ?? gameId,
      totalAttempts: stats.total,
      validAttempts: stats.valid,
      uniquePlayers: stats.players.size,
      sharePercent: Math.round((stats.total / denom) * 100),
    }))
    .sort((a, b) => b.totalAttempts - a.totalAttempts);

  const compRows = (compsRes.data ?? []) as Array<{ status?: string }>;
  const activeCompetitionsCount = compRows.filter((c) => c.status === 'active').length;
  const upcomingCompetitionsCount = compRows.filter((c) => c.status === 'upcoming').length;

  return {
    totalPlayers: playersCountRes.count ?? 0,
    totalAttempts: scoresCountRes.count ?? aggregatedTotal,
    gamesPlayedToday: todayRows.length,
    uniquePlayersToday: todayPlayerSet.size,
    uniquePlayersThisWeek: weekPlayerSet.size,
    pendingWinnerApprovals: pendingWinnersRes.count ?? 0,
    prizesAwaitingDistribution: awaitingPrizesRes.count ?? 0,
    popularGames,
    dailyWindow,
    weeklyWindow,
    activeCompetitionsCount,
    upcomingCompetitionsCount,
  };
}

export interface AdminPlayerDetailsResponse {
  player: AdminPlayerSummary;
  scores: AdminScoreHistoryItem[];
  rankings: {
    dailyOverall: {
      rank: number | null;
      totalPoints: number;
      windowLabel: string;
    };
    weeklyOverall: {
      rank: number | null;
      totalPoints: number;
      windowLabel: string;
    };
    perGame: Array<{
      gameId: ArcadeGameId;
      gameName: string;
      dailyRank: number | null;
      dailyBestScore: number | null;
      weeklyRank: number | null;
      weeklyBestScore: number | null;
      allTimeBestScore: number;
    }>;
  };
  competitionHistory: Array<{
    competitionId: string;
    competitionName: string;
    competitionType: CompetitionType;
    startsAt: string;
    endsAt: string;
    status: CompetitionStatus;
    attemptsCount: number;
    bestValidScore: number;
    winnerRecords: Array<{
      id: string;
      winnerType: 'overall' | 'per_game';
      gameName: string | null;
      rank: number;
      finalScore: number;
      competitionPoints: number;
      approvalStatus: WinnerApprovalStatus;
      prizeStatus: PrizeStatus;
      adminNote: string;
    }>;
  }>;
}

export async function adminGetPlayerDetails(
  playerId: string,
  overrideClient?: SupabaseClient
): Promise<AdminPlayerDetailsResponse> {
  if (!isValidUuid(playerId)) throw new HttpError(400, 'Invalid player ID.');
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const now = new Date();
  const dailyWindow = getAddisAbabaDailyWindow(now);
  const weeklyWindow = getAddisAbabaWeeklyWindow(now);
  const playableIds = PLAYABLE_GAMES.map((g) => g.id);

  const [
    { data: playerRows, error: pErr },
    { data: playerScoreRows, error: psErr },
    { data: winnerRows, error: wErr },
    dailyRawScores,
    weeklyRawScores,
  ] = await Promise.all([
    client.from('arcade_players').select('*').eq('id', playerId).limit(1),
    client
      .from('arcade_scores')
      .select('*, arcade_competitions(id, name, competition_type, starts_at, ends_at, status)')
      .eq('player_id', playerId)
      .order('played_at', { ascending: false })
      .limit(1000),
    client
      .from('arcade_winners')
      .select('*, arcade_competitions(id, name, competition_type, starts_at, ends_at, status)')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false }),
    queryValidScoresInWindow(client, {
      startsAt: dailyWindow.startsAt,
      endsAt: dailyWindow.endsAt,
      gameIds: playableIds,
    }),
    queryValidScoresInWindow(client, {
      startsAt: weeklyWindow.startsAt,
      endsAt: weeklyWindow.endsAt,
      gameIds: playableIds,
    }),
  ]);

  if (pErr) throw mapArcadeDbError('loading player details', pErr);
  if (!playerRows || playerRows.length === 0 || !playerRows[0]) {
    throw new HttpError(404, 'Arcade player not found.');
  }
  if (psErr) throw mapArcadeDbError('loading player score history', psErr);
  if (wErr) throw mapArcadeDbError('loading player competition history', wErr);

  const pRow = playerRows[0] as Record<string, unknown>;
  const normalized = String(pRow.phone_number_normalized ?? '');
  const rawPhone = String(pRow.phone_number ?? normalized);
  const createdAt = String(pRow.created_at ?? '');
  const nickname = String(pRow.nickname ?? 'Player');

  let validRuns = 0;
  let flaggedRuns = 0;
  let rejectedRuns = 0;
  let highestScore = 0;
  let lastActivityAt = createdAt;
  const bestScores: Record<string, number> = {};

  const compParticipation = new Map<
    string,
    {
      competitionId: string;
      competitionName: string;
      competitionType: CompetitionType;
      startsAt: string;
      endsAt: string;
      status: CompetitionStatus;
      attemptsCount: number;
      bestValidScore: number;
      winnerRecords: AdminPlayerDetailsResponse['competitionHistory'][number]['winnerRecords'];
    }
  >();

  const scores: AdminScoreHistoryItem[] = (playerScoreRows ?? [])
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
    .map((r) => {
      const gid = String(r.game_id) as ArcadeGameId;
      const score = Number(r.score ?? 0);
      const playedAt = String(r.played_at ?? '');
      const vStatus = (r.validation_status as ScoreValidationStatus) ?? 'valid';

      if (vStatus === 'valid') {
        validRuns += 1;
        if (score > highestScore) highestScore = score;
        if (!bestScores[gid] || score > bestScores[gid]) bestScores[gid] = score;
      } else if (vStatus === 'flagged') {
        flaggedRuns += 1;
      } else if (vStatus === 'rejected') {
        rejectedRuns += 1;
      }

      if (playedAt && (!lastActivityAt || playedAt > lastActivityAt)) {
        lastActivityAt = playedAt;
      }

      const compJoin = Array.isArray(r.arcade_competitions)
        ? ((r.arcade_competitions[0] as Record<string, unknown> | null | undefined) ?? null)
        : ((r.arcade_competitions as Record<string, unknown> | null | undefined) ?? null);

      const compId = typeof r.competition_id === 'string' ? r.competition_id : null;
      const compName = compJoin ? String(compJoin.name ?? 'Competition') : null;

      if (compId && compJoin) {
        const existing = compParticipation.get(compId) ?? {
          competitionId: compId,
          competitionName: compName ?? 'Competition',
          competitionType: compJoin.competition_type === 'weekly' ? 'weekly' : 'daily',
          startsAt: String(compJoin.starts_at ?? ''),
          endsAt: String(compJoin.ends_at ?? ''),
          status: (compJoin.status as CompetitionStatus) ?? 'active',
          attemptsCount: 0,
          bestValidScore: 0,
          winnerRecords: [],
        };
        existing.attemptsCount += 1;
        if (vStatus === 'valid' && score > existing.bestValidScore) {
          existing.bestValidScore = score;
        }
        compParticipation.set(compId, existing);
      }

      const dayLabel = formatAddisAbabaDayLabel(playedAt);
      const periodLabel = compName ?? (dayLabel ? `Daily (${dayLabel})` : 'Open Play');

      return {
        id: String(r.id),
        playerId,
        nickname,
        phoneNumber: normalized,
        maskedPhone: maskEthiopianPhone(normalized),
        gameId: gid,
        gameName: getArcadeGameMeta(gid)?.name ?? gid,
        score,
        playedAt,
        competitionId: compId,
        competitionPeriodLabel: periodLabel,
        validationStatus: vStatus,
        validationReason:
          typeof r.validation_reason === 'string' ? r.validation_reason : null,
        sessionId: String(r.session_id ?? ''),
        durationMs: typeof r.duration_ms === 'number' ? r.duration_ms : null,
      };
    });

  for (const row of (winnerRows ?? []) as Array<Record<string, unknown>>) {
    const compId = String(row.competition_id ?? '');
    const compJoin = Array.isArray(row.arcade_competitions)
      ? ((row.arcade_competitions[0] as Record<string, unknown> | null | undefined) ?? null)
      : ((row.arcade_competitions as Record<string, unknown> | null | undefined) ?? null);
    if (!compId) continue;

    const existing = compParticipation.get(compId) ?? {
      competitionId: compId,
      competitionName: compJoin ? String(compJoin.name ?? 'Competition') : 'Competition',
      competitionType: compJoin?.competition_type === 'weekly' ? 'weekly' : 'daily',
      startsAt: String(compJoin?.starts_at ?? ''),
      endsAt: String(compJoin?.ends_at ?? ''),
      status: (compJoin?.status as CompetitionStatus) ?? 'completed',
      attemptsCount: 0,
      bestValidScore: 0,
      winnerRecords: [],
    };
    const gid = typeof row.game_id === 'string' ? (row.game_id as ArcadeGameId) : null;
    existing.winnerRecords.push({
      id: String(row.id),
      winnerType: row.winner_type === 'per_game' ? 'per_game' : 'overall',
      gameName: gid ? getArcadeGameMeta(gid)?.name ?? gid : null,
      rank: Number(row.rank ?? 1),
      finalScore: Number(row.final_score ?? 0),
      competitionPoints: Number(row.competition_points ?? 0),
      approvalStatus: (row.approval_status as WinnerApprovalStatus) ?? 'pending',
      prizeStatus: (row.prize_status as PrizeStatus) ?? 'unclaimed',
      adminNote: String(row.admin_note ?? ''),
    });
    compParticipation.set(compId, existing);
  }

  const dailyOverall = computeOverallChampionStandings(
    dailyRawScores,
    playableIds,
    playerId
  );
  const weeklyOverall = computeOverallChampionStandings(
    weeklyRawScores,
    playableIds,
    playerId
  );

  const myDailyOverall = dailyOverall.overall.find((e) => e.playerId === playerId);
  const myWeeklyOverall = weeklyOverall.overall.find((e) => e.playerId === playerId);

  const perGameRankings = PLAYABLE_GAMES.map((g) => {
    const dEntry = (dailyOverall.perGame[g.id] ?? []).find(
      (e) => e.playerId === playerId
    );
    const wEntry = (weeklyOverall.perGame[g.id] ?? []).find(
      (e) => e.playerId === playerId
    );
    return {
      gameId: g.id,
      gameName: g.name,
      dailyRank: dEntry?.rank ?? null,
      dailyBestScore: dEntry?.bestScore ?? null,
      weeklyRank: wEntry?.rank ?? null,
      weeklyBestScore: wEntry?.bestScore ?? null,
      allTimeBestScore: bestScores[g.id] ?? 0,
    };
  });

  const competitionHistory = Array.from(compParticipation.values()).sort((a, b) =>
    b.startsAt.localeCompare(a.startsAt)
  );

  return {
    player: {
      id: String(pRow.id),
      nickname,
      phoneNumber: rawPhone,
      phoneNumberNormalized: normalized,
      maskedPhone: maskEthiopianPhone(normalized),
      status: (pRow.status as PlayerStatus) ?? 'active',
      createdAt,
      lastActivityAt: lastActivityAt || createdAt,
      totalRuns: scores.length,
      validRuns,
      flaggedRuns,
      rejectedRuns,
      highestScore,
      bestScores,
    },
    scores,
    rankings: {
      dailyOverall: {
        rank: myDailyOverall?.rank ?? null,
        totalPoints: myDailyOverall?.totalPoints ?? 0,
        windowLabel: dailyWindow.label,
      },
      weeklyOverall: {
        rank: myWeeklyOverall?.rank ?? null,
        totalPoints: myWeeklyOverall?.totalPoints ?? 0,
        windowLabel: weeklyWindow.label,
      },
      perGame: perGameRankings,
    },
    competitionHistory,
  };
}

export interface AdminAllScoresResponse {
  items: AdminScoreHistoryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  rangeLabel: string;
}

export async function adminQueryAllScores(
  params: {
    datePreset?: string;
    startDate?: string;
    endDate?: string;
    gameId?: string;
    playerId?: string;
    playerSearch?: string;
    validationStatus?: string;
    sortBy?: string;
    page?: number;
    pageSize?: number;
  },
  overrideClient?: SupabaseClient
): Promise<AdminAllScoresResponse> {
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const presetRaw = params.datePreset ?? 'all';
  const preset: DateRangePreset =
    presetRaw === 'today' ||
    presetRaw === 'yesterday' ||
    presetRaw === 'week' ||
    presetRaw === 'month' ||
    presetRaw === 'custom'
      ? presetRaw
      : 'all';

  const dateRange = getAddisAbabaDateRange(preset, params.startDate, params.endDate);
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  const pageSize = Math.min(100, Math.max(5, Math.floor(Number(params.pageSize) || 25)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Resolve playerSearch across all registered players before paging
  let matchedPlayerIds: string[] | null = null;
  if (params.playerId && isValidUuid(params.playerId)) {
    matchedPlayerIds = [params.playerId];
  } else if (params.playerSearch && params.playerSearch.trim()) {
    const clean = params.playerSearch.trim().toLowerCase();
    const cleanDigits = clean.replace(/\D/g, '');
    const { data: pRows, error: pErr } = await client
      .from('arcade_players')
      .select('id, nickname, phone_number_normalized, phone_number')
      .limit(2000);
    if (pErr) throw mapArcadeDbError('searching players for scores', pErr);

    matchedPlayerIds = (pRows ?? [])
      .filter((p) => {
        const pr = p as Record<string, unknown>;
        const nick = String(pr.nickname ?? '').toLowerCase();
        const phoneNorm = String(pr.phone_number_normalized ?? '').toLowerCase();
        const phoneRaw = String(pr.phone_number ?? '').toLowerCase();
        if (nick.includes(clean) || phoneNorm.includes(clean) || phoneRaw.includes(clean)) {
          return true;
        }
        if (cleanDigits.length >= 3 && phoneNorm.replace(/\D/g, '').includes(cleanDigits)) {
          return true;
        }
        return false;
      })
      .map((p) => String((p as Record<string, unknown>).id));

    if (matchedPlayerIds.length === 0) {
      return {
        items: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 1,
        rangeLabel: dateRange.label,
      };
    }
  }

  let query = client
    .from('arcade_scores')
    .select(
      '*, arcade_players!inner(nickname, phone_number_normalized), arcade_competitions(id, name, competition_type)',
      { count: 'exact' }
    );

  if (dateRange.startsAt) {
    query = query.gte('played_at', dateRange.startsAt);
  }
  if (dateRange.endsAt) {
    query = query.lt('played_at', dateRange.endsAt);
  }
  if (params.gameId && params.gameId !== 'all') {
    query = query.eq('game_id', params.gameId);
  }
  if (matchedPlayerIds) {
    query = query.in('player_id', matchedPlayerIds);
  }
  if (
    params.validationStatus === 'valid' ||
    params.validationStatus === 'flagged' ||
    params.validationStatus === 'rejected'
  ) {
    query = query.eq('validation_status', params.validationStatus);
  }

  if (params.sortBy === 'highest_score') {
    query = query
      .order('score', { ascending: false })
      .order('played_at', { ascending: true });
  } else {
    query = query.order('played_at', { ascending: false });
  }

  const { data, count, error } = await query.range(from, to);
  if (error) throw mapArcadeDbError('querying all arcade scores', error);

  const items: AdminScoreHistoryItem[] = (data ?? [])
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
    .map((r) => {
      const pInfo = Array.isArray(r.arcade_players)
        ? ((r.arcade_players[0] as Record<string, unknown> | null | undefined) ?? null)
        : ((r.arcade_players as Record<string, unknown> | null | undefined) ?? null);
      const compInfo = Array.isArray(r.arcade_competitions)
        ? ((r.arcade_competitions[0] as Record<string, unknown> | null | undefined) ?? null)
        : ((r.arcade_competitions as Record<string, unknown> | null | undefined) ?? null);

      const gid = String(r.game_id) as ArcadeGameId;
      const playedAt = String(r.played_at ?? '');
      const phone = String(pInfo?.phone_number_normalized ?? '');
      const compName = compInfo ? String(compInfo.name ?? 'Competition') : null;
      const dayLabel = formatAddisAbabaDayLabel(playedAt);

      return {
        id: String(r.id),
        playerId: String(r.player_id),
        nickname: String(pInfo?.nickname ?? 'Player'),
        phoneNumber: phone,
        maskedPhone: maskEthiopianPhone(phone),
        gameId: gid,
        gameName: getArcadeGameMeta(gid)?.name ?? gid,
        score: Number(r.score ?? 0),
        playedAt,
        competitionId: typeof r.competition_id === 'string' ? r.competition_id : null,
        competitionPeriodLabel:
          compName ?? (dayLabel ? `Daily (${dayLabel})` : 'Open Play'),
        validationStatus: (r.validation_status as ScoreValidationStatus) ?? 'valid',
        validationReason:
          typeof r.validation_reason === 'string' ? r.validation_reason : null,
        sessionId: String(r.session_id ?? ''),
        durationMs: typeof r.duration_ms === 'number' ? r.duration_ms : null,
      };
    });

  const totalCount = count ?? items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages,
    rangeLabel: dateRange.label,
  };
}

export interface AdminLeaderboardsResponse {
  period: LeaderboardPeriod;
  periodLabel: string;
  timezone: string;
  startsAt: string | null;
  endsAt: string | null;
  competition: ArcadeCompetition | null;
  perGame: Array<{
    gameId: ArcadeGameId;
    gameName: string;
    entries: LeaderboardEntry[];
  }>;
  overall: OverallChampionEntry[];
}

export async function adminGetLeaderboards(
  params: { period?: LeaderboardPeriod; competitionId?: string | null },
  overrideClient?: SupabaseClient
): Promise<AdminLeaderboardsResponse> {
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const now = new Date();
  const nowIso = now.toISOString();
  const period: LeaderboardPeriod =
    params.period === 'weekly' || params.period === 'all_time'
      ? params.period
      : 'daily';

  let competition: ArcadeCompetition | null = null;
  let startsAt: string | null = null;
  let endsAt: string | null = null;
  let periodLabel = 'All-Time Standings';

  if (params.competitionId && isValidUuid(params.competitionId)) {
    const { data, error } = await client
      .from('arcade_competitions')
      .select('*')
      .eq('id', params.competitionId)
      .limit(1);
    if (error) throw mapArcadeDbError('loading selected competition leaderboard', error);
    if (data && data.length > 0 && data[0]) {
      competition = mapCompetitionRow(data[0] as Record<string, unknown>);
      startsAt = competition.startsAt;
      endsAt = competition.endsAt;
      periodLabel = competition.name;
    }
  } else if (period === 'daily') {
    const { data, error } = await client
      .from('arcade_competitions')
      .select('*')
      .eq('competition_type', 'daily')
      .eq('status', 'active')
      .lte('starts_at', nowIso)
      .gt('ends_at', nowIso)
      .order('starts_at', { ascending: false })
      .limit(1);
    if (error) throw mapArcadeDbError('loading active daily competition', error);
    if (data && data.length > 0 && data[0]) {
      competition = mapCompetitionRow(data[0] as Record<string, unknown>);
      startsAt = competition.startsAt;
      endsAt = competition.endsAt;
      periodLabel = competition.name;
    } else {
      const win = getAddisAbabaDailyWindow(now);
      startsAt = win.startsAt;
      endsAt = win.endsAt;
      periodLabel = win.label;
    }
  } else if (period === 'weekly') {
    const { data, error } = await client
      .from('arcade_competitions')
      .select('*')
      .eq('competition_type', 'weekly')
      .eq('status', 'active')
      .lte('starts_at', nowIso)
      .gt('ends_at', nowIso)
      .order('starts_at', { ascending: false })
      .limit(1);
    if (error) throw mapArcadeDbError('loading active weekly competition', error);
    if (data && data.length > 0 && data[0]) {
      competition = mapCompetitionRow(data[0] as Record<string, unknown>);
      startsAt = competition.startsAt;
      endsAt = competition.endsAt;
      periodLabel = competition.name;
    } else {
      const win = getAddisAbabaWeeklyWindow(now);
      startsAt = win.startsAt;
      endsAt = win.endsAt;
      periodLabel = win.label;
    }
  }

  const eligibleGames: ArcadeGameId[] =
    competition?.eligibleGames ?? PLAYABLE_GAMES.map((g) => g.id);

  const rawScores = await queryValidScoresInWindow(client, {
    startsAt: startsAt ?? undefined,
    endsAt: endsAt ?? undefined,
    gameIds: eligibleGames,
  });

  const standings = computeOverallChampionStandings(rawScores, eligibleGames);
  const perGame = eligibleGames.map((gid) => ({
    gameId: gid,
    gameName: getArcadeGameMeta(gid)?.name ?? gid,
    entries: standings.perGame[gid] ?? [],
  }));

  return {
    period,
    periodLabel,
    timezone: competition?.timezone ?? COMPETITION_TIMEZONE,
    startsAt,
    endsAt,
    competition,
    perGame,
    overall: standings.overall,
  };
}

export interface AdminHistoricalWinnersGroup {
  competition: ArcadeCompetition;
  winners: AdminWinnerRecord[];
}

export async function adminListHistoricalWinners(
  overrideClient?: SupabaseClient
): Promise<{ history: AdminHistoricalWinnersGroup[] }> {
  if (!overrideClient) ensureServiceRoleConfigured();
  const client = getServerSupabaseClient(overrideClient);

  const [{ data: winnerRows, error: wErr }, { data: compRows, error: cErr }] =
    await Promise.all([
      client
        .from('arcade_winners')
        .select('*, arcade_players!inner(nickname, phone_number_normalized)')
        .order('created_at', { ascending: false })
        .limit(500),
      client
        .from('arcade_competitions')
        .select('*')
        .order('ends_at', { ascending: false })
        .limit(100),
    ]);

  if (wErr) throw mapArcadeDbError('loading historical winners', wErr);
  if (cErr) throw mapArcadeDbError('loading historical competitions', cErr);

  const compMap = new Map<string, ArcadeCompetition>();
  for (const row of (compRows ?? []) as Array<Record<string, unknown>>) {
    const mapped = mapCompetitionRow(row);
    compMap.set(mapped.id, mapped);
  }

  const byComp = new Map<string, AdminWinnerRecord[]>();
  for (const row of (winnerRows ?? []) as Array<Record<string, unknown>>) {
    const compId = String(row.competition_id ?? '');
    if (!compMap.has(compId)) continue;
    const pInfo = Array.isArray(row.arcade_players)
      ? ((row.arcade_players[0] as Record<string, unknown> | null | undefined) ?? null)
      : ((row.arcade_players as Record<string, unknown> | null | undefined) ?? null);
    const phone = String(pInfo?.phone_number_normalized ?? '');
    const gid = typeof row.game_id === 'string' ? (row.game_id as ArcadeGameId) : null;

    const list = byComp.get(compId) ?? [];
    list.push({
      id: String(row.id),
      competitionId: compId,
      playerId: String(row.player_id),
      nickname: String(pInfo?.nickname ?? 'Player'),
      phoneNumber: phone,
      maskedPhone: maskEthiopianPhone(phone),
      gameId: gid,
      gameName: gid ? getArcadeGameMeta(gid)?.name ?? gid : null,
      winnerType: row.winner_type === 'per_game' ? 'per_game' : 'overall',
      rank: Number(row.rank ?? 1),
      finalScore: Number(row.final_score ?? 0),
      competitionPoints: Number(row.competition_points ?? 0),
      approvalStatus: (row.approval_status as WinnerApprovalStatus) ?? 'pending',
      prizeStatus: (row.prize_status as PrizeStatus) ?? 'unclaimed',
      adminNote: String(row.admin_note ?? ''),
      approvedAt: typeof row.approved_at === 'string' ? row.approved_at : null,
      awardedAt: typeof row.awarded_at === 'string' ? row.awarded_at : null,
      createdAt: String(row.created_at ?? ''),
    });
    byComp.set(compId, list);
  }

  const history: AdminHistoricalWinnersGroup[] = [];
  for (const comp of compMap.values()) {
    const winners = byComp.get(comp.id);
    if (winners && winners.length > 0) {
      history.push({ competition: comp, winners });
    }
  }

  return { history };
}

