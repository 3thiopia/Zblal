export type ArcadeGameId =
  | 'poop-man'
  | 'toilet-basketball'
  | 'poop-drop'
  | 'poop-run'
  | 'dont-drop-the-poop';

export type PlayableArcadeGameId =
  | 'poop-man'
  | 'toilet-basketball'
  | 'poop-drop'
  | 'poop-run'
  | 'dont-drop-the-poop';

export type LeaderboardPeriod = 'daily' | 'weekly' | 'all_time';
export type CompetitionType = 'daily' | 'weekly';
export type CompetitionStatus = 'upcoming' | 'active' | 'completed' | 'disabled';
export type PlayerStatus = 'active' | 'flagged' | 'suspended';
export type ScoreValidationStatus = 'valid' | 'flagged' | 'rejected' | 'pending';
export type WinnerApprovalStatus = 'pending' | 'approved' | 'rejected';
export type PrizeStatus = 'unclaimed' | 'contacted' | 'awarded' | 'forfeited';

export const COMPETITION_TIMEZONE = 'Africa/Addis_Ababa';

export const PLACEMENT_POINTS_TABLE: ReadonlyArray<{
  rank: number;
  label: string;
  points: number;
}> = [
  { rank: 1, label: '1st', points: 100 },
  { rank: 2, label: '2nd', points: 80 },
  { rank: 3, label: '3rd', points: 60 },
  { rank: 4, label: '4th', points: 40 },
  { rank: 5, label: '5th', points: 20 },
];

export function getPlacementPoints(rank: number): number {
  const row = PLACEMENT_POINTS_TABLE.find((item) => item.rank === rank);
  return row ? row.points : 0;
}

export interface ArcadeGameMeta {
  id: ArcadeGameId;
  dbCode: string;
  name: string;
  shortDescription: string;
  playable: boolean;
  comingSoon: boolean;
  localBestKey?: string;
  maxValidScore: number;
  suspiciousScoreThreshold: number;
  maxPointsPerSecond: number;
}

export const ARCADE_GAMES: ReadonlyArray<ArcadeGameMeta> = [
  {
    id: 'poop-man',
    dbCode: 'poop_man',
    name: 'Poop Man',
    shortDescription:
      'Maze arcade classic. Collect every toilet-paper roll, grab golden rolls for speed boosts, and dodge the germs!',
    playable: true,
    comingSoon: false,
    localBestKey: 'popo_man_high_score',
    maxValidScore: 250000,
    suspiciousScoreThreshold: 35000,
    maxPointsPerSecond: 450,
  },
  {
    id: 'toilet-basketball',
    dbCode: 'toilet_basketball',
    name: 'Toilet Basketball',
    shortDescription:
      'Drag back, aim the arc, and sink poop shots into the porcelain hoop before 3 misses end your streak!',
    playable: true,
    comingSoon: false,
    localBestKey: 'zblal_toilet_basketball_high_score',
    maxValidScore: 500,
    suspiciousScoreThreshold: 120,
    maxPointsPerSecond: 1.8,
  },
  {
    id: 'poop-drop',
    dbCode: 'poop_drop',
    name: 'Poop Drop',
    shortDescription:
      'Slide your toilet bucket to catch falling poops and bonus rolls while dodging plungers and germs!',
    playable: true,
    comingSoon: false,
    localBestKey: 'zblal_poop_drop_high_score',
    maxValidScore: 15000,
    suspiciousScoreThreshold: 1800,
    maxPointsPerSecond: 35,
  },
  {
    id: 'poop-run',
    dbCode: 'poop_run',
    name: 'Poop Run',
    shortDescription:
      'Endless bathroom sprint — jump over plungers, slide under overhead pipes, and grab toilet paper rolls!',
    playable: true,
    comingSoon: false,
    localBestKey: 'zblal_poop_run_high_score',
    maxValidScore: 100000,
    suspiciousScoreThreshold: 15000,
    maxPointsPerSecond: 180,
  },
  {
    id: 'dont-drop-the-poop',
    dbCode: 'dont_drop',
    name: "Don't Drop the Poop",
    shortDescription:
      'Tap to keep the bouncing poop airborne through bathroom pipe gates and floating germs!',
    playable: true,
    comingSoon: false,
    localBestKey: 'zblal_dont_drop_high_score',
    maxValidScore: 5000,
    suspiciousScoreThreshold: 400,
    maxPointsPerSecond: 15,
  },
];

export const PLAYABLE_GAMES = ARCADE_GAMES.filter((g) => g.playable);

export function getArcadeGameMeta(gameId: string): ArcadeGameMeta | undefined {
  return ARCADE_GAMES.find((g) => g.id === gameId || g.dbCode === gameId);
}

export function toDbGameCode(gameId: string): string {
  const meta = getArcadeGameMeta(gameId);
  return meta ? meta.dbCode : gameId;
}

export function fromDbGameCode(dbCode: string): ArcadeGameId | null {
  const meta = ARCADE_GAMES.find((g) => g.dbCode === dbCode || g.id === dbCode);
  return meta ? meta.id : null;
}

export function isPlayableGameId(gameId: string): gameId is PlayableArcadeGameId {
  return (
    gameId === 'poop-man' ||
    gameId === 'toilet-basketball' ||
    gameId === 'poop-drop' ||
    gameId === 'poop-run' ||
    gameId === 'dont-drop-the-poop'
  );
}

export interface PublicArcadePlayer {
  id: string;
  nickname: string;
  maskedPhone: string;
  status: PlayerStatus;
  createdAt: string;
  bestScores?: Record<string, number>;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  nickname: string;
  maskedPhone: string;
  bestScore: number;
  playedAt: string;
  gameId: ArcadeGameId;
  gameName: string;
  isCurrentPlayer?: boolean;
}

export interface OverallGameBreakdown {
  gameId: ArcadeGameId;
  gameName: string;
  rank: number;
  bestScore: number;
  points: number;
  playedAt: string;
}

export interface OverallChampionEntry {
  rank: number;
  playerId: string;
  nickname: string;
  maskedPhone: string;
  totalPoints: number;
  firstPlaceWins: number;
  breakdown: OverallGameBreakdown[];
  isCurrentPlayer?: boolean;
}

export interface ArcadeCompetition {
  id: string;
  name: string;
  competitionType: CompetitionType;
  startsAt: string;
  endsAt: string;
  timezone: string;
  eligibleGames: ArcadeGameId[];
  prizeDescription: string;
  status: CompetitionStatus;
  createdAt: string;
}

export interface CompetitionStandings {
  competition: ArcadeCompetition;
  overall: OverallChampionEntry[];
  perGame: Record<string, LeaderboardEntry[]>;
}

// Africa/Addis_Ababa is fixed at UTC+3 year-round (no Daylight Saving Time)
const ADDIS_OFFSET_MS = 3 * 60 * 60 * 1000;

export function getAddisAbabaDailyWindow(now: Date = new Date()): {
  startsAt: string;
  endsAt: string;
  label: string;
} {
  const shifted = new Date(now.getTime() + ADDIS_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();

  const startUtcMs = Date.UTC(y, m, d, 0, 0, 0, 0) - ADDIS_OFFSET_MS;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: COMPETITION_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(now);

  return {
    startsAt: new Date(startUtcMs).toISOString(),
    endsAt: new Date(endUtcMs).toISOString(),
    label: `Daily (${dateLabel} · EAT)`,
  };
}

export function getAddisAbabaWeeklyWindow(now: Date = new Date()): {
  startsAt: string;
  endsAt: string;
  label: string;
} {
  const shifted = new Date(now.getTime() + ADDIS_OFFSET_MS);
  const dayOfWeek = shifted.getUTCDay(); // 0=Sun, 1=Mon...
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  const mondayShifted = new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate() - daysSinceMonday,
      0,
      0,
      0,
      0
    )
  );
  const startUtcMs = mondayShifted.getTime() - ADDIS_OFFSET_MS;
  const endUtcMs = startUtcMs + 7 * 24 * 60 * 60 * 1000;

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: COMPETITION_TIMEZONE,
    month: 'short',
    day: 'numeric',
  });
  const label = `Weekly (${fmt.format(new Date(startUtcMs))} – ${fmt.format(
    new Date(endUtcMs - 1000)
  )} · EAT)`;

  return {
    startsAt: new Date(startUtcMs).toISOString(),
    endsAt: new Date(endUtcMs).toISOString(),
    label,
  };
}

export type DateRangePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'custom';

export function getAddisAbabaDateRange(
  preset: DateRangePreset,
  customStartDate?: string,
  customEndDate?: string,
  now: Date = new Date()
): {
  startsAt: string | null;
  endsAt: string | null;
  label: string;
} {
  if (preset === 'all') {
    return { startsAt: null, endsAt: null, label: 'All Dates' };
  }

  const shifted = new Date(now.getTime() + ADDIS_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();

  if (preset === 'today') {
    const win = getAddisAbabaDailyWindow(now);
    return { startsAt: win.startsAt, endsAt: win.endsAt, label: 'Today (EAT)' };
  }

  if (preset === 'yesterday') {
    const startUtcMs = Date.UTC(y, m, d - 1, 0, 0, 0, 0) - ADDIS_OFFSET_MS;
    const endUtcMs = Date.UTC(y, m, d, 0, 0, 0, 0) - ADDIS_OFFSET_MS;
    return {
      startsAt: new Date(startUtcMs).toISOString(),
      endsAt: new Date(endUtcMs).toISOString(),
      label: 'Yesterday (EAT)',
    };
  }

  if (preset === 'week') {
    const win = getAddisAbabaWeeklyWindow(now);
    return { startsAt: win.startsAt, endsAt: win.endsAt, label: 'This Week (EAT)' };
  }

  if (preset === 'month') {
    const startUtcMs = Date.UTC(y, m, 1, 0, 0, 0, 0) - ADDIS_OFFSET_MS;
    const endUtcMs = Date.UTC(y, m + 1, 1, 0, 0, 0, 0) - ADDIS_OFFSET_MS;
    return {
      startsAt: new Date(startUtcMs).toISOString(),
      endsAt: new Date(endUtcMs).toISOString(),
      label: 'This Month (EAT)',
    };
  }

  // Custom YYYY-MM-DD bounds interpreted in Africa/Addis_Ababa (UTC+3)
  const parseYmd = (raw?: string): [number, number, number] | null => {
    if (!raw) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
    if (!match) return null;
    const yr = Number(match[1]);
    const mo = Number(match[2]);
    const dy = Number(match[3]);
    if (!yr || mo < 1 || mo > 12 || dy < 1 || dy > 31) return null;
    return [yr, mo - 1, dy];
  };

  const startParts = parseYmd(customStartDate);
  const endParts = parseYmd(customEndDate);

  const startsAt = startParts
    ? new Date(
        Date.UTC(startParts[0], startParts[1], startParts[2], 0, 0, 0, 0) -
          ADDIS_OFFSET_MS
      ).toISOString()
    : null;
  const endsAt = endParts
    ? new Date(
        Date.UTC(endParts[0], endParts[1], endParts[2] + 1, 0, 0, 0, 0) -
          ADDIS_OFFSET_MS
      ).toISOString()
    : null;

  return {
    startsAt,
    endsAt,
    label: `Custom (${customStartDate || '...'} to ${customEndDate || '...'} EAT)`,
  };
}

export function formatCompetitionDateTime(
  iso: string,
  timeZone: string = COMPETITION_TIMEZONE
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatAddisAbabaDayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: COMPETITION_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatCountdownRemaining(endsAtIso: string, nowMs: number = Date.now()): string {
  const diff = new Date(endsAtIso).getTime() - nowMs;
  if (!Number.isFinite(diff) || diff <= 0) {
    return 'Ended';
  }
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  if (days > 0) {
    return `${days}d ${pad(hours)}h ${pad(mins)}m`;
  }
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}
