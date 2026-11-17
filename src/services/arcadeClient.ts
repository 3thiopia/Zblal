import type {
  AdminWinnerRecord,
  ArcadeCompetition,
  ArcadeGameId,
  LeaderboardEntry,
  LeaderboardPeriod,
  OverallChampionEntry,
  PlayerStatus,
  PrizeStatus,
  PublicArcadePlayer,
  ScoreValidationStatus,
  WinnerApprovalStatus,
} from '../arcade/arcadeConfig.ts';

const PLAYER_STORAGE_KEY = 'zblal_arcade_player_v1';

export interface StoredPlayerSession {
  playerId: string;
  nickname: string;
  maskedPhone: string;
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
  }
}

async function parseResponseJsonSafely(response: Response): Promise<unknown> {
  if (typeof response.text === 'function') {
    const rawText = await response.text().catch(() => '');
    if (!rawText.trim()) return null;
    try {
      return JSON.parse(rawText);
    } catch {
      return null;
    }
  }
  if (typeof response.json === 'function') {
    return response.json().catch(() => null);
  }
  return null;
}

async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  });

  const payload = await parseResponseJsonSafely(response);
  const payloadObj =
    payload !== null && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;

  if (!response.ok) {
    const message =
      payloadObj && typeof payloadObj.error === 'string' && payloadObj.error.trim()
        ? payloadObj.error
        : `Request failed (${response.status})`;
    const err = new Error(message) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  if (!payloadObj) {
    const err = new Error(
      'Received an empty or invalid JSON response from the arcade server.'
    ) as Error & { status?: number };
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
  const res = await apiRequest<{
    player?: PublicArcadePlayer | null;
    returning?: boolean;
  }>('/api/arcade/players/register', {
    method: 'POST',
    body: JSON.stringify({ nickname, phoneNumber }),
  });
  if (!res?.player || typeof res.player.id !== 'string') {
    throw new Error('Server returned an incomplete player profile.');
  }
  return {
    player: res.player,
    returning: Boolean(res.returning),
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

// ---------------------------------------------------------------------------
// Admin Endpoints
// ---------------------------------------------------------------------------
export async function getAdminAuthConfig(): Promise<{
  passcodeEnabled: boolean;
  firebaseEnabled: boolean;
}> {
  return apiRequest('/api/admin/arcade/auth-config');
}

export async function loginAdminWithPasscode(
  passcode: string
): Promise<{ token: string; email: string }> {
  return apiRequest('/api/admin/arcade/passcode-login', {
    method: 'POST',
    body: JSON.stringify({ passcode }),
  });
}

export async function checkAdminSession(
  token: string
): Promise<{ authorized: boolean; adminEmail: string }> {
  return apiRequest('/api/admin/arcade/session', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminListCompetitions(
  token: string
): Promise<{ competitions: ArcadeCompetition[] }> {
  return apiRequest('/api/admin/arcade/competitions', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminCreateCompetition(
  token: string,
  payload: {
    name: string;
    competitionType: 'daily' | 'weekly';
    startsAt: string;
    endsAt: string;
    timezone?: string;
    eligibleGames: ArcadeGameId[];
    prizeDescription: string;
    status: string;
  }
): Promise<{ competition: ArcadeCompetition }> {
  return apiRequest('/api/admin/arcade/competitions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateCompetition(
  token: string,
  competitionId: string,
  patch: Partial<{
    name: string;
    startsAt: string;
    endsAt: string;
    eligibleGames: ArcadeGameId[];
    prizeDescription: string;
    status: string;
  }>
): Promise<{ competition: ArcadeCompetition }> {
  return apiRequest(`/api/admin/arcade/competitions/${encodeURIComponent(competitionId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
}

export interface AdminCompetitionWinnersResponse {
  competition: ArcadeCompetition;
  overallStandings: Array<OverallChampionEntry & { phoneNumber: string }>;
  perGameStandings: Record<string, Array<LeaderboardEntry & { phoneNumber: string }>>;
  savedWinners: AdminWinnerRecord[];
}

export async function adminGetCompetitionWinners(
  token: string,
  competitionId: string
): Promise<AdminCompetitionWinnersResponse> {
  return apiRequest(
    `/api/admin/arcade/competitions/${encodeURIComponent(competitionId)}/winners`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

export async function adminSnapshotWinners(
  token: string,
  competitionId: string
): Promise<{ winners: AdminWinnerRecord[] }> {
  return apiRequest(
    `/api/admin/arcade/competitions/${encodeURIComponent(competitionId)}/snapshot-winners`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

export async function adminReviewWinner(
  token: string,
  winnerId: string,
  patch: {
    approvalStatus?: WinnerApprovalStatus;
    prizeStatus?: PrizeStatus;
    adminNote?: string;
  }
): Promise<{ winner: AdminWinnerRecord }> {
  return apiRequest(`/api/admin/arcade/winners/${encodeURIComponent(winnerId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
}

export interface AdminPlayersResponse {
  players: Array<{
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
  }>;
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
}

export interface AdminOverviewResponse {
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

export interface AdminPlayerDetailsResponse {
  player: AdminPlayersResponse['players'][number];
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
    competitionType: 'daily' | 'weekly';
    startsAt: string;
    endsAt: string;
    status: 'upcoming' | 'active' | 'completed' | 'disabled';
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

export interface AdminAllScoresResponse {
  items: AdminScoreHistoryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  rangeLabel: string;
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

export interface AdminHistoricalWinnersGroup {
  competition: ArcadeCompetition;
  winners: AdminWinnerRecord[];
}

export async function adminFetchOverview(
  token: string
): Promise<AdminOverviewResponse> {
  return apiRequest('/api/admin/arcade/overview', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminListPlayers(
  token: string,
  params?: { search?: string; status?: string }
): Promise<AdminPlayersResponse> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.status && params.status !== 'all') qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiRequest(`/api/admin/arcade/players${suffix}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminGetPlayerDetails(
  token: string,
  playerId: string
): Promise<AdminPlayerDetailsResponse> {
  return apiRequest(`/api/admin/arcade/players/${encodeURIComponent(playerId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminQueryAllScores(
  token: string,
  params: {
    datePreset?: string;
    startDate?: string;
    endDate?: string;
    gameId?: string;
    playerId?: string;
    playerSearch?: string;
    validationStatus?: string;
    sortBy?: 'newest' | 'highest_score';
    page?: number;
    pageSize?: number;
  }
): Promise<AdminAllScoresResponse> {
  const qs = new URLSearchParams();
  if (params.datePreset) qs.set('datePreset', params.datePreset);
  if (params.startDate) qs.set('startDate', params.startDate);
  if (params.endDate) qs.set('endDate', params.endDate);
  if (params.gameId && params.gameId !== 'all') qs.set('gameId', params.gameId);
  if (params.playerId) qs.set('playerId', params.playerId);
  if (params.playerSearch) qs.set('playerSearch', params.playerSearch);
  if (params.validationStatus && params.validationStatus !== 'all') {
    qs.set('validationStatus', params.validationStatus);
  }
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  return apiRequest(`/api/admin/arcade/scores?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminFetchLeaderboards(
  token: string,
  params: { period: LeaderboardPeriod; competitionId?: string | null }
): Promise<AdminLeaderboardsResponse> {
  const qs = new URLSearchParams({ period: params.period });
  if (params.competitionId) qs.set('competitionId', params.competitionId);
  return apiRequest(`/api/admin/arcade/leaderboards?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminFetchHistoricalWinners(
  token: string
): Promise<{ history: AdminHistoricalWinnersGroup[] }> {
  return apiRequest('/api/admin/arcade/winners/history', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminUpdatePlayerStatus(
  token: string,
  playerId: string,
  status: PlayerStatus
) {
  return apiRequest(`/api/admin/arcade/players/${encodeURIComponent(playerId)}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
}

export async function adminUpdateScoreValidation(
  token: string,
  scoreId: string,
  validationStatus: ScoreValidationStatus,
  validationReason?: string
) {
  return apiRequest(
    `/api/admin/arcade/scores/${encodeURIComponent(scoreId)}/validation`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ validationStatus, validationReason }),
    }
  );
}
