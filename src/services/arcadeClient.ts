import {
  ARCADE_GAMES,
  type ArcadeCompetition,
  type ArcadeGameId,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type OverallChampionEntry,
  type PrizeStatus,
  type PublicArcadePlayer,
  type ScoreValidationStatus,
  type WinnerApprovalStatus,
} from '../arcade/arcadeConfig.ts';

const PLAYER_STORAGE_KEY = 'zblal_arcade_player_v1';

export interface StoredPlayerSession {
  playerId: string;
  nickname: string;
  maskedPhone: string;
}

function clearLocalGameBestScores() {
  if (typeof window === 'undefined') return;
  try {
    for (const game of ARCADE_GAMES) {
      if (game.localBestKey) {
        window.localStorage.removeItem(game.localBestKey);
      }
    }
  } catch {
    // Ignore localStorage access errors
  }
}

function syncLocalGameBestScores(
  bestScores: Record<string, number> | undefined,
  replaceAll: boolean
) {
  if (typeof window === 'undefined') return;
  try {
    if (replaceAll) {
      clearLocalGameBestScores();
    }
    if (!bestScores) return;
    for (const game of ARCADE_GAMES) {
      if (!game.localBestKey) continue;
      const serverBest = bestScores[game.id];
      if (typeof serverBest !== 'number' || !Number.isFinite(serverBest) || serverBest <= 0) {
        continue;
      }
      const rawLocal = window.localStorage.getItem(game.localBestKey);
      const localBest = rawLocal ? Number.parseInt(rawLocal, 10) : 0;
      if (replaceAll || !Number.isFinite(localBest) || serverBest > localBest) {
        window.localStorage.setItem(game.localBestKey, String(Math.floor(serverBest)));
      }
    }
  } catch {
    // Ignore localStorage quota errors
  }
}

export function loadSavedArcadePlayer(): StoredPlayerSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PLAYER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPlayerSession>;
    if (
      typeof parsed.playerId === 'string' &&
      parsed.playerId.trim() &&
      typeof parsed.nickname === 'string' &&
      typeof parsed.maskedPhone === 'string'
    ) {
      return {
        playerId: parsed.playerId,
        nickname: parsed.nickname,
        maskedPhone: parsed.maskedPhone,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveArcadePlayerSession(player: PublicArcadePlayer): StoredPlayerSession {
  const prevSession = loadSavedArcadePlayer();
  const isDifferentPlayer = !prevSession || prevSession.playerId !== player.id;

  const session: StoredPlayerSession = {
    playerId: player.id,
    nickname: player.nickname,
    maskedPhone: player.maskedPhone,
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignore localStorage quota errors
    }
    syncLocalGameBestScores(player.bestScores, isDifferentPlayer);
  }
  return session;
}

export function clearArcadePlayerSession() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(PLAYER_STORAGE_KEY);
    } catch {
      // Ignore
    }
    clearLocalGameBestScores();
  }
}

async function readAndParseResponse(response: Response): Promise<{
  rawText: string;
  contentType: string;
  parsed: unknown;
  parseError: boolean;
}> {
  const contentType = response.headers?.get?.('content-type') ?? '';
  let rawText = '';
  if (typeof response.text === 'function') {
    rawText = await response.text().catch(() => '');
  } else if (typeof response.json === 'function') {
    const jsonVal = await response.json().catch(() => undefined);
    if (jsonVal !== undefined) {
      return {
        rawText: JSON.stringify(jsonVal),
        contentType: contentType || 'application/json',
        parsed: jsonVal,
        parseError: false,
      };
    }
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    return { rawText: '', contentType, parsed: null, parseError: false };
  }

  try {
    return {
      rawText,
      contentType,
      parsed: JSON.parse(trimmed),
      parseError: false,
    };
  } catch {
    return { rawText, contentType, parsed: null, parseError: true };
  }
}

async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch (networkErr: unknown) {
    const detail =
      networkErr instanceof Error && networkErr.message
        ? networkErr.message
        : 'Network request failed';
    throw new Error(`Unable to reach arcade server (${detail}). Please check your connection.`);
  }

  const { rawText, contentType, parsed, parseError } =
    await readAndParseResponse(response);
  const payloadObj =
    parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;

  if (!response.ok) {
    const serverMessage =
      payloadObj && typeof payloadObj.error === 'string' && payloadObj.error.trim()
        ? payloadObj.error.trim()
        : payloadObj &&
          typeof payloadObj.message === 'string' &&
          payloadObj.message.trim()
        ? payloadObj.message.trim()
        : null;

    const looksLikeHtml =
      contentType.toLowerCase().includes('text/html') ||
      /^\s*<(?:!doctype|html)\b/i.test(rawText);
    const plainFallback =
      !looksLikeHtml && rawText.trim()
        ? rawText.trim().slice(0, 180)
        : `Arcade server returned HTTP ${response.status}.`;

    const err = new Error(serverMessage || plainFallback) as Error & {
      status?: number;
    };
    err.status = response.status;
    throw err;
  }

  if (!payloadObj) {
    const looksLikeHtml =
      contentType.toLowerCase().includes('text/html') ||
      /^\s*<(?:!doctype|html)\b/i.test(rawText);

    const detail = looksLikeHtml
      ? 'Arcade API endpoint returned an HTML page instead of JSON. Ensure the API server is deployed and running.'
      : !rawText.trim()
      ? `Arcade server returned an empty response (HTTP ${response.status}).`
      : parseError
      ? `Arcade server returned invalid JSON (HTTP ${response.status}).`
      : `Arcade server returned an unexpected response format (HTTP ${response.status}).`;

    const err = new Error(detail) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  return payloadObj as T;
}

export async function checkArcadeSchemaStatus(): Promise<{
  initialized: boolean;
  tables?: Record<string, string>;
}> {
  const res = await apiRequest<{
    initialized?: boolean;
    tables?: Record<string, string>;
  }>('/api/arcade/schema-status');
  return {
    initialized: Boolean(res?.initialized),
    tables: res?.tables,
  };
}

export async function registerArcadePlayer(
  nickname: string,
  phoneNumber: string
): Promise<{ player: PublicArcadePlayer; returning: boolean }> {
  const cleanNickname = nickname.replace(/\s+/g, ' ').trim();
  const cleanPhone = phoneNumber.trim();
  const res = await apiRequest<{
    success?: boolean;
    player?: PublicArcadePlayer | null;
    returning?: boolean;
  }>('/api/arcade/players/register', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'register',
      nickname: cleanNickname,
      phoneNumber: cleanPhone,
    }),
  });
  if (!res?.player || typeof res.player.id !== 'string') {
    throw new Error('Server returned an incomplete player profile.');
  }
  return {
    player: res.player,
    returning: Boolean(res.returning),
  };
}

export async function loginReturningArcadePlayer(
  phoneNumber: string
): Promise<{ player: PublicArcadePlayer; returning: boolean }> {
  const cleanPhone = phoneNumber.trim();
  const res = await apiRequest<{
    success?: boolean;
    player?: PublicArcadePlayer | null;
    returning?: boolean;
  }>('/api/arcade/players/register', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'login',
      phoneNumber: cleanPhone,
    }),
  });
  if (!res?.player || typeof res.player.id !== 'string') {
    throw new Error('Server returned an incomplete player profile.');
  }
  return {
    player: res.player,
    returning: true,
  };
}

export async function refreshArcadePlayer(
  playerId: string
): Promise<{ player: PublicArcadePlayer }> {
  const res = await apiRequest<{ player?: PublicArcadePlayer | null }>(
    `/api/arcade/players/me?playerId=${encodeURIComponent(playerId)}`
  );
  if (!res?.player || typeof res.player.id !== 'string') {
    const err = new Error('Player profile was not returned by server.') as Error & {
      status?: number;
    };
    err.status = 404;
    throw err;
  }
  return { player: res.player };
}

export async function submitArcadeScore(input: {
  playerId: string;
  gameId: ArcadeGameId;
  score: number;
  sessionId: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}): Promise<{
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
  const res = await apiRequest<{
    scoreRecord?: {
      id: string;
      gameId: ArcadeGameId;
      score: number;
      validationStatus: ScoreValidationStatus;
      playedAt: string;
      isNewPersonalBest: boolean;
    } | null;
    bestScores?: Record<string, number> | null;
  }>('/api/arcade/scores', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res?.scoreRecord || typeof res.scoreRecord.id !== 'string') {
    throw new Error('Server returned an incomplete score submission response.');
  }
  return {
    scoreRecord: res.scoreRecord,
    bestScores:
      res.bestScores && typeof res.bestScores === 'object' ? res.bestScores : {},
  };
}

export interface LeaderboardResponse {
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
}

export async function fetchLeaderboard(params: {
  gameId: string;
  period: LeaderboardPeriod;
  playerId?: string | null;
  competitionId?: string | null;
}): Promise<LeaderboardResponse> {
  const qs = new URLSearchParams({
    gameId: params.gameId,
    period: params.period,
  });
  if (params.playerId) qs.set('playerId', params.playerId);
  if (params.competitionId) qs.set('competitionId', params.competitionId);
  const res = await apiRequest<Partial<LeaderboardResponse>>(
    `/api/arcade/leaderboards?${qs.toString()}`
  );
  return {
    gameId: typeof res?.gameId === 'string' ? res.gameId : params.gameId,
    gameName: typeof res?.gameName === 'string' ? res.gameName : 'Leaderboard',
    period: res?.period ?? params.period,
    periodLabel: typeof res?.periodLabel === 'string' ? res.periodLabel : params.period,
    startsAt: typeof res?.startsAt === 'string' ? res.startsAt : null,
    endsAt: typeof res?.endsAt === 'string' ? res.endsAt : null,
    competition: res?.competition ?? null,
    entries: Array.isArray(res?.entries) ? res.entries : [],
    overallEntries: Array.isArray(res?.overallEntries) ? res.overallEntries : [],
    currentPlayerRank:
      typeof res?.currentPlayerRank === 'number' ? res.currentPlayerRank : null,
  };
}

export interface CompetitionsOverviewResponse {
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
}

export async function fetchCompetitionsOverview(
  playerId?: string | null
): Promise<CompetitionsOverviewResponse> {
  const qs = playerId ? `?playerId=${encodeURIComponent(playerId)}` : '';
  const res = await apiRequest<Partial<CompetitionsOverviewResponse>>(
    `/api/arcade/competitions/overview${qs}`
  );
  return {
    dailyCompetition: res?.dailyCompetition ?? null,
    weeklyCompetition: res?.weeklyCompetition ?? null,
    dailyFallbackWindow: res?.dailyFallbackWindow ?? {
      startsAt: '',
      endsAt: '',
      label: 'Daily Challenge',
    },
    weeklyFallbackWindow: res?.weeklyFallbackWindow ?? {
      startsAt: '',
      endsAt: '',
      label: 'Weekly Challenge',
    },
    recentCompleted: Array.isArray(res?.recentCompleted) ? res.recentCompleted : [],
    overallStandings: {
      daily: Array.isArray(res?.overallStandings?.daily)
        ? res.overallStandings.daily
        : [],
      weekly: Array.isArray(res?.overallStandings?.weekly)
        ? res.overallStandings.weekly
        : [],
      allTime: Array.isArray(res?.overallStandings?.allTime)
        ? res.overallStandings.allTime
        : [],
    },
  };
}


