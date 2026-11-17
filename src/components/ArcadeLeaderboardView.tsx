import { useCallback, useEffect, useState } from 'react';
import { Award, Clock, Info, RefreshCw, Trophy } from 'lucide-react';
import {
  ARCADE_GAMES,
  COMPETITION_TIMEZONE,
  PLACEMENT_POINTS_TABLE,
  formatCompetitionDateTime,
  formatCountdownRemaining,
  type LeaderboardPeriod,
} from '../arcade/arcadeConfig.ts';
import {
  fetchCompetitionsOverview,
  fetchLeaderboard,
  type CompetitionsOverviewResponse,
  type LeaderboardResponse,
} from '../services/arcadeClient.ts';

interface ArcadeLeaderboardViewProps {
  currentPlayerId?: string | null;
  initialGameId?: string;
  initialPeriod?: LeaderboardPeriod;
}

const GAME_TABS = [
  { id: 'overall', label: 'Overall Champion' },
  ...ARCADE_GAMES.filter((g) => g.playable).map((g) => ({
    id: g.id,
    label: g.name,
  })),
];

const PERIOD_TABS: Array<{ id: LeaderboardPeriod; label: string }> = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'all_time', label: 'All-Time' },
];

export function ArcadeLeaderboardView({
  currentPlayerId,
  initialGameId = 'overall',
  initialPeriod = 'daily',
}: ArcadeLeaderboardViewProps) {
  const [selectedGame, setSelectedGame] = useState(initialGameId);
  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [overview, setOverview] = useState<CompetitionsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setSelectedGame(initialGameId);
  }, [initialGameId]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [lbRes, ovRes] = await Promise.all([
        fetchLeaderboard({
          gameId: selectedGame,
          period,
          playerId: currentPlayerId,
        }),
        fetchCompetitionsOverview(currentPlayerId),
      ]);
      setLeaderboard(lbRes);
      setOverview(ovRes);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to load leaderboards.'
      );
    } finally {
      setLoading(false);
    }
  }, [currentPlayerId, period, selectedGame]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const dailyEndsAt =
    overview?.dailyCompetition?.endsAt ?? overview?.dailyFallbackWindow?.endsAt;
  const weeklyEndsAt =
    overview?.weeklyCompetition?.endsAt ?? overview?.weeklyFallbackWindow?.endsAt;

  const isOverall = selectedGame === 'overall';
  const rawRows = isOverall ? leaderboard?.overallEntries : leaderboard?.entries;
  const rows = Array.isArray(rawRows) ? rawRows.filter(Boolean) : [];

  const podiumColors = [
    {
      ring: 'border-[#FACC15]',
      bg: 'bg-[#FACC15]/15',
      num: 'text-[#FACC15]',
      label: '1st',
    },
    {
      ring: 'border-[#E2E8F0]/70',
      bg: 'bg-white/10',
      num: 'text-[#E2E8F0]',
      label: '2nd',
    },
    {
      ring: 'border-[#FB923C]/80',
      bg: 'bg-[#FB923C]/12',
      num: 'text-[#FDBA74]',
      label: '3rd',
    },
  ];

  return (
    <div className="space-y-5 pb-6">
      {/* Daily & Weekly Challenge Cards with Live Countdowns */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="rounded-2xl border border-[#245C44] bg-[#143B2B] p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-display text-base sm:text-lg font-bold text-[#F7F4EC]">
                {overview.dailyCompetition?.name ?? 'Daily Challenge'}
              </h4>
              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#CEF04E] tabular-nums shrink-0">
                <Clock className="w-3.5 h-3.5" />
                {dailyEndsAt ? formatCountdownRemaining(dailyEndsAt, nowMs) : '—'}
              </span>
            </div>
            <p className="text-xs text-[#CDE0D6]">
              {overview.dailyCompetition?.prizeDescription ||
                'Daily top overall champion & per-game leaders reviewed manually by Zblal admins.'}
            </p>
            <div className="text-[11px] text-[#9AB7A9] flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                Ends:{' '}
                {dailyEndsAt
                  ? formatCompetitionDateTime(dailyEndsAt, COMPETITION_TIMEZONE)
                  : 'Midnight EAT'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{COMPETITION_TIMEZONE}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#245C44] bg-[#143B2B] p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-display text-base sm:text-lg font-bold text-[#F7F4EC]">
                {overview.weeklyCompetition?.name ?? 'Weekly Challenge'}
              </h4>
              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#FACC15] tabular-nums shrink-0">
                <Clock className="w-3.5 h-3.5" />
                {weeklyEndsAt ? formatCountdownRemaining(weeklyEndsAt, nowMs) : '—'}
              </span>
            </div>
            <p className="text-xs text-[#CDE0D6]">
              {overview.weeklyCompetition?.prizeDescription ||
                'Weekly champion & game winners reviewed manually after the competition closes.'}
            </p>
            <div className="text-[11px] text-[#9AB7A9] flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                Ends:{' '}
                {weeklyEndsAt
                  ? formatCompetitionDateTime(weeklyEndsAt, COMPETITION_TIMEZONE)
                  : 'Sunday Midnight EAT'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{COMPETITION_TIMEZONE}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#245C44] bg-[#143B2B] p-3.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {GAME_TABS.map((tab) => {
            const active = selectedGame === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedGame(tab.id)}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#CEF04E] text-[#143B2B]'
                    : 'bg-[#0E291E] text-[#CDE0D6] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 justify-between sm:justify-end">
          <div className="flex items-center gap-1 bg-[#0E291E] p-1 rounded-xl">
            {PERIOD_TABS.map((pt) => {
              const active = period === pt.id;
              return (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => setPeriod(pt.id)}
                  className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#1F543D] text-[#CEF04E]'
                      : 'text-[#9AB7A9] hover:text-white'
                  }`}
                >
                  {pt.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            aria-label="Refresh leaderboard"
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-[#245C44] bg-[#0E291E] hover:bg-[#194432] text-[#F7F4EC] cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Period Info & Current Player Rank Highlight */}
      {leaderboard && !errorMsg && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#CDE0D6] px-1">
          <div>
            <span className="font-semibold text-[#F7F4EC]">
              {leaderboard.gameName}
            </span>
            <span aria-hidden="true"> · </span>
            <span>{leaderboard.periodLabel}</span>
            {leaderboard.endsAt && (
              <>
                <span aria-hidden="true"> · </span>
                <span>
                  Ends {formatCompetitionDateTime(leaderboard.endsAt, COMPETITION_TIMEZONE)}
                </span>
              </>
            )}
          </div>
          {leaderboard.currentPlayerRank !== null &&
            leaderboard.currentPlayerRank !== undefined && (
            <div className="font-mono font-bold text-[#CEF04E] tabular-nums">
              Your Position: #{leaderboard.currentPlayerRank}
            </div>
          )}
        </div>
      )}

      {/* Loading / Error / Empty / Podium + Table */}
      {loading ? (
        <div className="rounded-2xl border border-[#245C44] bg-[#143B2B] p-8 text-center text-sm text-[#CDE0D6]">
          Loading {isOverall ? 'Overall Champion' : 'game'} standings...
        </div>
      ) : errorMsg ? (
        <div className="rounded-2xl border border-[#EF4444]/40 bg-[#7F1D1D]/30 p-5 text-center space-y-3">
          <p className="text-sm text-[#FECACA]">{errorMsg}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#CEF04E] text-[#143B2B] text-xs font-bold cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-[#245C44] bg-[#143B2B] p-8 text-center space-y-2">
          <Trophy className="w-8 h-8 mx-auto text-[#9AB7A9]" />
          <h4 className="font-display text-lg font-bold text-[#F7F4EC]">
            No Valid Scores Yet
          </h4>
          <p className="text-xs sm:text-sm text-[#CDE0D6] max-w-md mx-auto">
            Be the first player on the {leaderboard?.periodLabel ?? period} board!
            Play Poop Man or Toilet Basketball to claim #1.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {rows.slice(0, 3).map((row, idx) => {
              const style = podiumColors[idx];
              const isMe = row.isCurrentPlayer;
              const metricValue =
                'totalPoints' in row ? `${row.totalPoints} pts` : `${row.bestScore.toLocaleString()}`;
              return (
                <div
                  key={row.playerId}
                  className={`rounded-2xl border-2 ${style.ring} ${
                    isMe ? 'bg-[#1D523B]' : style.bg
                  } p-4 flex flex-col justify-between gap-2`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-display text-lg font-bold ${style.num}`}>
                      #{row.rank} {style.label}
                    </span>
                    {isMe && (
                      <span className="text-[11px] font-mono font-bold text-[#CEF04E]">
                        YOU
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-display text-base font-bold text-[#F7F4EC] truncate">
                      {row.nickname}
                    </p>
                    <p className="text-xs font-mono text-[#9AB7A9] tabular-nums">
                      {row.maskedPhone}
                    </p>
                  </div>
                  <div className="pt-1 border-t border-white/10 flex items-baseline justify-between">
                    <span className="text-[11px] text-[#CDE0D6]">
                      {'totalPoints' in row ? 'Competition Points' : 'Best Run'}
                    </span>
                    <span className="font-mono text-base font-bold text-[#CEF04E] tabular-nums">
                      {metricValue}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full Standings List */}
          <div className="rounded-2xl border border-[#245C44] bg-[#143B2B] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-[#245C44] text-[11px] font-mono text-[#9AB7A9]">
                    <th className="py-2.5 px-3.5">Rank</th>
                    <th className="py-2.5 px-3.5">Player</th>
                    <th className="py-2.5 px-3.5">Phone</th>
                    <th className="py-2.5 px-3.5 text-right">
                      {isOverall ? 'Total Points' : 'Best Score'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#245C44]/60">
                  {rows.map((row) => {
                    const isMe = row.isCurrentPlayer;
                    return (
                      <tr
                        key={row.playerId}
                        className={isMe ? 'bg-[#1D523B]' : 'hover:bg-white/[0.03]'}
                      >
                        <td className="py-2.5 px-3.5 font-mono font-bold text-[#F7F4EC]">
                          #{row.rank}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="font-semibold text-[#F7F4EC]">
                            {row.nickname}
                            {isMe && (
                              <span className="ml-2 text-[11px] font-mono text-[#CEF04E]">
                                (You)
                              </span>
                            )}
                          </div>
                          {'breakdown' in row &&
                            Array.isArray(row.breakdown) &&
                            row.breakdown.length > 0 && (
                            <div className="text-[11px] text-[#9AB7A9] mt-0.5">
                              {row.breakdown
                                .map((b) => `${b.gameName}: #${b.rank} (${b.points} pts)`)
                                .join(' · ')}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-xs text-[#9AB7A9] whitespace-nowrap">
                          {row.maskedPhone}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#CEF04E] whitespace-nowrap">
                          {'totalPoints' in row
                            ? `${row.totalPoints} pts`
                            : (row.bestScore ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Overall Champion Points & Fairness Explanation */}
      <div className="rounded-2xl border border-[#245C44] bg-[#143B2B] p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-sm font-display font-bold text-[#F7F4EC]">
          <Info className="w-4 h-4 text-[#CEF04E] shrink-0" />
          <span>How Rankings & Overall Champion Points Work</span>
        </div>
        <p className="text-xs text-[#CDE0D6] leading-relaxed">
          Each game ranks players by their <strong>highest valid single-run score</strong>{' '}
          during the competition window (earlier score wins ties). Raw scores are
          never added across games—instead, Overall Champion points are awarded
          by placement in each eligible game:
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-[#F7F4EC] tabular-nums">
          {PLACEMENT_POINTS_TABLE.map((item) => (
            <span key={item.rank}>
              {item.label}: <strong className="text-[#CEF04E]">{item.points} pts</strong>
            </span>
          ))}
          <span className="text-[#9AB7A9]">6th+: 0 pts</span>
        </div>
        <p className="text-[11px] text-[#9AB7A9] leading-relaxed">
          Free entry · No purchase required · Browser scores are checked for
          anomalies on the server, and all prize winners undergo manual admin review
          and phone contact confirmation before distribution.
        </p>
      </div>

      {/* Historical Approved Winners Archive */}
      {overview &&
        Array.isArray(overview.recentCompleted) &&
        overview.recentCompleted.length > 0 && (
        <div className="rounded-2xl border border-[#245C44] bg-[#143B2B] p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-display font-bold text-[#F7F4EC]">
            <Award className="w-4 h-4 text-[#FACC15]" />
            <span>Recent Approved Winners</span>
          </div>
          <div className="space-y-3">
            {overview.recentCompleted
              .filter((item) => Boolean(item?.competition?.id))
              .map(({ competition, winners }) => {
                const safeWinners = Array.isArray(winners) ? winners : [];
                return (
              <div
                key={competition.id}
                className="rounded-xl border border-[#245C44] bg-[#0E291E] p-3 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#F7F4EC]">{competition.name}</span>
                  <span className="text-[#9AB7A9]">
                    {(competition.competitionType ?? 'daily').toUpperCase()} ·{' '}
                    {formatCompetitionDateTime(competition.endsAt, competition.timezone)}
                  </span>
                </div>
                {safeWinners.length === 0 ? (
                  <p className="text-xs text-[#9AB7A9]">
                    Winner verification in progress by admin.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {safeWinners.map((w) => (
                      <div
                        key={w.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums"
                      >
                        <div>
                          <span className="font-semibold text-[#CEF04E]">
                            {w.winnerType === 'overall'
                              ? 'Overall Champion'
                              : w.gameName ?? 'Game Winner'}
                          </span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-bold text-[#F7F4EC]">{w.nickname}</span>
                          <span className="ml-1.5 font-mono text-[#9AB7A9]">
                            ({w.maskedPhone})
                          </span>
                        </div>
                        <div className="font-mono text-[#CDE0D6]">
                          {w.winnerType === 'overall'
                            ? `${w.competitionPoints ?? 0} pts`
                            : `${(w.finalScore ?? 0).toLocaleString()} pts`}
                          <span aria-hidden="true"> · </span>
                          <span className="text-[#9AB7A9]">Prize: {w.prizeStatus}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
