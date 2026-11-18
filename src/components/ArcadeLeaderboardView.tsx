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
import { useLanguage } from '../i18n/LanguageContext.tsx';
import {
  fetchCompetitionsOverview,
  fetchLeaderboard,
  type CompetitionsOverviewResponse,
  type LeaderboardResponse,
} from '../services/arcadeClient.ts';
import { triggerHaptic } from '../utils/haptics.ts';

interface ArcadeLeaderboardViewProps {
  currentPlayerId?: string | null;
  initialGameId?: string;
  initialPeriod?: LeaderboardPeriod;
}

export function ArcadeLeaderboardView({
  currentPlayerId,
  initialGameId = 'overall',
  initialPeriod = 'daily',
}: ArcadeLeaderboardViewProps) {
  const { t } = useLanguage();
  const lb = t.arcade.leaderboard;
  const hub = t.arcade.hub;

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
        err instanceof Error ? err.message : lb.loadingGame
      );
    } finally {
      setLoading(false);
    }
  }, [currentPlayerId, lb.loadingGame, period, selectedGame]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const gameTabs = [
    { id: 'overall', label: lb.overallTab },
    ...ARCADE_GAMES.filter((g) => g.playable).map((g) => ({
      id: g.id,
      label: t.arcade.games[g.id].name,
    })),
  ];

  const periodTabs: Array<{ id: LeaderboardPeriod; label: string }> = [
    { id: 'daily', label: lb.periodDaily },
    { id: 'weekly', label: lb.periodWeekly },
    { id: 'all_time', label: lb.periodAllTime },
  ];

  const dailyEndsAt =
    overview?.dailyCompetition?.endsAt ?? overview?.dailyFallbackWindow?.endsAt;
  const weeklyEndsAt =
    overview?.weeklyCompetition?.endsAt ?? overview?.weeklyFallbackWindow?.endsAt;

  const dailyCountdown = dailyEndsAt
    ? formatCountdownRemaining(dailyEndsAt, nowMs)
    : null;
  const weeklyCountdown = weeklyEndsAt
    ? formatCountdownRemaining(weeklyEndsAt, nowMs)
    : null;

  const isOverall = selectedGame === 'overall';
  const rawRows = isOverall ? leaderboard?.overallEntries : leaderboard?.entries;
  const rows = Array.isArray(rawRows) ? rawRows.filter(Boolean) : [];

  const displayGameName = isOverall
    ? lb.overallTab
    : (t.arcade.games[selectedGame as keyof typeof t.arcade.games]?.name ??
        leaderboard?.gameName ??
        selectedGame);

  const periodTitleFallback =
    period === 'daily'
      ? lb.periodDaily
      : period === 'weekly'
      ? lb.periodWeekly
      : lb.periodAllTime;

  const podiumColors = [
    {
      ring: 'border-[#FACC15]',
      bg: 'bg-[#FACC15]/14',
      num: 'text-[#FACC15]',
      label: lb.rank1Label,
    },
    {
      ring: 'border-[#E2E8F0]/65',
      bg: 'bg-white/[0.08]',
      num: 'text-[#E2E8F0]',
      label: lb.rank2Label,
    },
    {
      ring: 'border-[#FB923C]/75',
      bg: 'bg-[#FB923C]/12',
      num: 'text-[#FDBA74]',
      label: lb.rank3Label,
    },
  ];

  return (
    <div className={`space-y-4 pb-6 ${t.meta.isEthiopic ? 'font-ethiopic' : ''}`}>
      {/* Compact Live Challenge Windows */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-[#245C44] bg-[#133829] p-3.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-display text-sm sm:text-base font-bold text-[#F7F4EC] truncate">
                {overview.dailyCompetition?.name ?? lb.dailyChallenge}
              </h4>
              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#CEF04E] tabular-nums shrink-0">
                <Clock className="w-3.5 h-3.5" />
                {dailyCountdown
                  ? dailyCountdown === 'Ended'
                    ? hub.ended
                    : dailyCountdown
                  : '—'}
              </span>
            </div>
            <p className="text-xs text-[#CDE0D6] line-clamp-2 leading-relaxed">
              {overview.dailyCompetition?.prizeDescription || lb.dailyPrizeFallback}
            </p>
            <div className="text-[11px] text-[#9AB7A9]">
              {lb.endsPrefix}{' '}
              {dailyEndsAt
                ? formatCompetitionDateTime(dailyEndsAt, COMPETITION_TIMEZONE)
                : lb.midnightEat}{' '}
              · {COMPETITION_TIMEZONE}
            </div>
          </div>

          <div className="rounded-2xl border border-[#245C44] bg-[#133829] p-3.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-display text-sm sm:text-base font-bold text-[#F7F4EC] truncate">
                {overview.weeklyCompetition?.name ?? lb.weeklyChallenge}
              </h4>
              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#FACC15] tabular-nums shrink-0">
                <Clock className="w-3.5 h-3.5" />
                {weeklyCountdown
                  ? weeklyCountdown === 'Ended'
                    ? hub.ended
                    : weeklyCountdown
                  : '—'}
              </span>
            </div>
            <p className="text-xs text-[#CDE0D6] line-clamp-2 leading-relaxed">
              {overview.weeklyCompetition?.prizeDescription || lb.weeklyPrizeFallback}
            </p>
            <div className="text-[11px] text-[#9AB7A9]">
              {lb.endsPrefix}{' '}
              {weeklyEndsAt
                ? formatCompetitionDateTime(weeklyEndsAt, COMPETITION_TIMEZONE)
                : lb.sundayMidnightEat}{' '}
              · {COMPETITION_TIMEZONE}
            </div>
          </div>
        </div>
      )}

      {/* Game & Period Filters */}
      <div className="rounded-2xl border border-[#245C44] bg-[#133829] p-3 space-y-2.5">
        {/* Horizontal swipeable game selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {gameTabs.map((tab) => {
            const active = selectedGame === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic(5);
                  setSelectedGame(tab.id);
                }}
                className={`min-h-[42px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#CEF04E] text-[#143B2B] shadow-[0_2px_0_#0A1F16]'
                    : 'bg-[#0B2219] text-[#CDE0D6] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Segmented Period Tabs + Refresh */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 sm:flex-initial grid grid-cols-3 sm:flex items-center gap-1 bg-[#0B2219] p-1 rounded-xl">
            {periodTabs.map((pt) => {
              const active = period === pt.id;
              return (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(5);
                    setPeriod(pt.id);
                  }}
                  className={`min-h-[40px] px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap truncate cursor-pointer ${
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
            onClick={() => {
              triggerHaptic(6);
              void loadData();
            }}
            aria-label={lb.refreshAria}
            className="min-h-[42px] min-w-[42px] inline-flex items-center justify-center rounded-xl border border-[#245C44] bg-[#0B2219] hover:bg-[#194432] text-[#F7F4EC] cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Period Info & Player Position */}
      {leaderboard && !errorMsg && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#CDE0D6] px-1">
          <div>
            <span className="font-semibold text-[#F7F4EC]">{displayGameName}</span>
            <span aria-hidden="true"> · </span>
            <span>{periodTitleFallback}</span>
          </div>
          {leaderboard.currentPlayerRank !== null &&
            leaderboard.currentPlayerRank !== undefined && (
              <div className="font-mono font-bold text-[#CEF04E] tabular-nums">
                {lb.yourRank} #{leaderboard.currentPlayerRank}
              </div>
            )}
        </div>
      )}

      {/* Standings Content */}
      {loading ? (
        <div className="rounded-2xl border border-[#245C44] bg-[#133829] p-8 text-center text-sm text-[#CDE0D6]">
          {isOverall ? lb.loadingOverall : lb.loadingGame}
        </div>
      ) : errorMsg ? (
        <div className="rounded-2xl border border-[#EF4444]/40 bg-[#7F1D1D]/30 p-5 text-center space-y-3">
          <p className="text-sm text-[#FECACA]">{errorMsg}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-[#CEF04E] text-[#143B2B] text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            {lb.tryAgain}
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-[#245C44] bg-[#133829] p-8 text-center space-y-2">
          <Trophy className="w-8 h-8 mx-auto text-[#9AB7A9]" />
          <h4 className="font-display text-lg font-bold text-[#F7F4EC]">
            {lb.noScoresTitle}
          </h4>
          <p className="text-xs sm:text-sm text-[#CDE0D6] max-w-md mx-auto leading-relaxed">
            {lb.noScoresSubtitle(periodTitleFallback)}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {rows.slice(0, 3).map((row, idx) => {
              const style = podiumColors[idx];
              const isMe = row.isCurrentPlayer;
              const metricValue =
                'totalPoints' in row
                  ? `${row.totalPoints} ${lb.ptsUnit}`
                  : `${row.bestScore.toLocaleString()}`;
              return (
                <div
                  key={row.playerId}
                  className={`rounded-2xl border-2 ${style.ring} ${
                    isMe ? 'bg-[#1D523B]' : style.bg
                  } ${idx === 0 ? 'col-span-2 sm:col-span-1' : ''} p-3.5 flex flex-col justify-between gap-2`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-display text-base sm:text-lg font-bold ${style.num}`}>
                      #{row.rank} {style.label}
                    </span>
                    {isMe && (
                      <span className="text-[11px] font-mono font-bold text-[#CEF04E]">
                        {lb.youBadge}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-sm sm:text-base font-bold text-[#F7F4EC] truncate">
                      {row.nickname}
                    </p>
                    <p className="text-[11px] font-mono text-[#9AB7A9] tabular-nums truncate">
                      {row.maskedPhone}
                    </p>
                  </div>
                  <div className="pt-1.5 border-t border-white/10 flex items-baseline justify-between gap-2">
                    <span className="text-[11px] text-[#CDE0D6] truncate">
                      {'totalPoints' in row ? lb.pointsLabel : lb.bestLabel}
                    </span>
                    <span className="font-mono text-sm sm:text-base font-bold text-[#CEF04E] tabular-nums shrink-0">
                      {metricValue}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile-First Ranked Player Card List */}
          <div className="md:hidden space-y-2">
            {rows.map((row) => {
              const isMe = row.isCurrentPlayer;
              const valueLabel =
                'totalPoints' in row
                  ? `${row.totalPoints} ${lb.ptsUnit}`
                  : (row.bestScore ?? 0).toLocaleString();
              return (
                <div
                  key={row.playerId}
                  className={`rounded-2xl border px-3.5 py-3 flex items-center justify-between gap-3 tabular-nums ${
                    isMe
                      ? 'border-[#CEF04E]/60 bg-[#1B4B37]'
                      : 'border-[#245C44] bg-[#133829]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold ${
                        row.rank <= 3
                          ? 'bg-[#CEF04E] text-[#143B2B]'
                          : 'bg-[#0B2219] text-[#CDE0D6]'
                      }`}
                    >
                      #{row.rank}
                    </span>
                    <div className="min-w-0">
                      <div className="font-display text-sm font-bold text-[#F7F4EC] truncate">
                        {row.nickname}
                        {isMe && (
                          <span className="ml-1.5 text-[11px] font-mono text-[#CEF04E]">
                            {lb.youParen}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-[#9AB7A9] truncate">
                        {row.maskedPhone}
                      </div>
                      {'breakdown' in row &&
                        Array.isArray(row.breakdown) &&
                        row.breakdown.length > 0 && (
                          <div className="text-[11px] text-[#CDE0D6] mt-0.5 truncate">
                            {row.breakdown
                              .map((b) => {
                                const gName =
                                  t.arcade.games[b.gameId]?.name ?? b.gameName;
                                return `${gName}: #${b.rank}`;
                              })
                              .join(' · ')}
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-base font-bold text-[#CEF04E]">
                      {valueLabel}
                    </div>
                    <div className="text-[10px] text-[#9AB7A9]">
                      {isOverall ? lb.pointsLabel : lb.bestScoreLabel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Standings Table */}
          <div className="hidden md:block rounded-2xl border border-[#245C44] bg-[#133829] overflow-hidden">
            <table className="w-full text-left text-sm tabular-nums">
              <thead>
                <tr className="border-b border-[#245C44] text-[11px] font-mono text-[#9AB7A9]">
                  <th className="py-2.5 px-4">{lb.tableRank}</th>
                  <th className="py-2.5 px-4">{lb.tablePlayer}</th>
                  <th className="py-2.5 px-4">{lb.tablePhone}</th>
                  <th className="py-2.5 px-4 text-right">
                    {isOverall ? lb.tableTotalPoints : lb.tableBestScore}
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
                      <td className="py-2.5 px-4 font-mono font-bold text-[#F7F4EC]">
                        #{row.rank}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-[#F7F4EC]">
                          {row.nickname}
                          {isMe && (
                            <span className="ml-2 text-[11px] font-mono text-[#CEF04E]">
                              {lb.youParen}
                            </span>
                          )}
                        </div>
                        {'breakdown' in row &&
                          Array.isArray(row.breakdown) &&
                          row.breakdown.length > 0 && (
                            <div className="text-[11px] text-[#9AB7A9] mt-0.5">
                              {row.breakdown
                                .map((b) => {
                                  const gName =
                                    t.arcade.games[b.gameId]?.name ?? b.gameName;
                                  return `${gName}: #${b.rank} (${b.points} ${lb.ptsUnit})`;
                                })
                                .join(' · ')}
                            </div>
                          )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-[#9AB7A9] whitespace-nowrap">
                        {row.maskedPhone}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-[#CEF04E] whitespace-nowrap">
                        {'totalPoints' in row
                          ? `${row.totalPoints} ${lb.ptsUnit}`
                          : (row.bestScore ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Overall Champion Points Guide */}
      <div className="rounded-2xl border border-[#245C44] bg-[#133829] p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-display font-bold text-[#F7F4EC]">
          <Info className="w-4 h-4 text-[#CEF04E] shrink-0" />
          <span>{lb.howRankingsWork}</span>
        </div>
        <p className="text-xs text-[#CDE0D6] leading-relaxed">
          {lb.rankingsExplanationPrefix}
          <strong>{lb.rankingsExplanationStrong}</strong>
          {lb.rankingsExplanationSuffix}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-[#F7F4EC] tabular-nums">
          {PLACEMENT_POINTS_TABLE.map((item, idx) => (
            <span key={item.rank}>
              {lb.placementRanks[idx] ?? item.label}:{' '}
              <strong className="text-[#CEF04E]">
                {item.points} {lb.ptsUnit}
              </strong>
            </span>
          ))}
          <span className="text-[#9AB7A9]">{lb.sixthPlusZero}</span>
        </div>
      </div>

      {/* Approved Past Winners Archive */}
      {overview &&
        Array.isArray(overview.recentCompleted) &&
        overview.recentCompleted.length > 0 && (
          <div className="rounded-2xl border border-[#245C44] bg-[#133829] p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-display font-bold text-[#F7F4EC]">
              <Award className="w-4 h-4 text-[#FACC15] shrink-0" />
              <span>{lb.recentApprovedWinners}</span>
            </div>
            <div className="space-y-2.5">
              {overview.recentCompleted
                .filter((item) => Boolean(item?.competition?.id))
                .map(({ competition, winners }) => {
                  const safeWinners = Array.isArray(winners) ? winners : [];
                  const compTypeLabel =
                    competition.competitionType === 'weekly'
                      ? lb.periodWeekly
                      : lb.periodDaily;
                  return (
                    <div
                      key={competition.id}
                      className="rounded-xl border border-[#245C44] bg-[#0B2219] p-3 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-[#F7F4EC]">{competition.name}</span>
                        <span className="text-[#9AB7A9]">
                          {compTypeLabel} ·{' '}
                          {formatCompetitionDateTime(
                            competition.endsAt,
                            competition.timezone
                          )}
                        </span>
                      </div>
                      {safeWinners.length === 0 ? (
                        <p className="text-xs text-[#9AB7A9]">
                          {lb.winnerVerificationInProgress}
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
                                    ? lb.overallChampion
                                    : (w.gameId && t.arcade.games[w.gameId]?.name) ||
                                      w.gameName ||
                                      lb.gameWinner}
                                </span>
                                <span aria-hidden="true"> · </span>
                                <span className="font-bold text-[#F7F4EC]">{w.nickname}</span>
                                <span className="ml-1.5 font-mono text-[#9AB7A9]">
                                  ({w.maskedPhone})
                                </span>
                              </div>
                              <div className="font-mono text-[#CDE0D6]">
                                {w.winnerType === 'overall'
                                  ? `${w.competitionPoints ?? 0} ${lb.ptsUnit}`
                                  : `${(w.finalScore ?? 0).toLocaleString()} ${lb.ptsUnit}`}
                                <span aria-hidden="true"> · </span>
                                <span className="text-[#9AB7A9]">
                                  {lb.prizeLabel}{' '}
                                  {lb.prizeStatuses[w.prizeStatus] ?? w.prizeStatus}
                                </span>
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
