import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';
import {
  COMPETITION_TIMEZONE,
  formatCompetitionDateTime,
  type PlayerStatus,
  type ScoreValidationStatus,
} from '../../arcade/arcadeConfig.ts';
import {
  adminGetPlayerDetails,
  adminListPlayers,
  type AdminPlayerDetailsResponse,
  type AdminPlayersResponse,
} from '../../services/arcadeClient.ts';

interface AdminPlayersSectionProps {
  authToken: string;
  initialSelectedPlayerId?: string | null;
  onClearInitialPlayer?: () => void;
  onUpdatePlayerStatus: (playerId: string, status: PlayerStatus) => Promise<void>;
  onUpdateScoreValidation: (
    scoreId: string,
    status: ScoreValidationStatus
  ) => Promise<void>;
}

export function AdminPlayersSection({
  authToken,
  initialSelectedPlayerId,
  onClearInitialPlayer,
  onUpdatePlayerStatus,
  onUpdateScoreValidation,
}: AdminPlayersSectionProps) {
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PlayerStatus>('all');
  const [players, setPlayers] = useState<AdminPlayersResponse['players']>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(
    initialSelectedPlayerId ?? null
  );
  const [details, setDetails] = useState<AdminPlayerDetailsResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedPlayerId) {
      setSelectedPlayerId(initialSelectedPlayerId);
    }
  }, [initialSelectedPlayerId]);

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await adminListPlayers(authToken, {
        search: appliedSearch || undefined,
        status: statusFilter,
      });
      setPlayers(Array.isArray(res?.players) ? res.players : []);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to load registered players.'
      );
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, authToken, statusFilter]);

  useEffect(() => {
    void loadPlayers();
  }, [loadPlayers]);

  const loadPlayerDetails = useCallback(
    async (playerId: string) => {
      setDetailsLoading(true);
      setDetailsError(null);
      try {
        const res = await adminGetPlayerDetails(authToken, playerId);
        setDetails(res);
      } catch (err: unknown) {
        setDetailsError(
          err instanceof Error ? err.message : 'Failed to load player details.'
        );
      } finally {
        setDetailsLoading(false);
      }
    },
    [authToken]
  );

  useEffect(() => {
    if (selectedPlayerId) {
      void loadPlayerDetails(selectedPlayerId);
    } else {
      setDetails(null);
    }
  }, [loadPlayerDetails, selectedPlayerId]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const handleStatusChange = async (playerId: string, nextStatus: PlayerStatus) => {
    await onUpdatePlayerStatus(playerId, nextStatus);
    await loadPlayers();
    if (selectedPlayerId === playerId) {
      await loadPlayerDetails(playerId);
    }
  };

  const handleScoreModeration = async (
    scoreId: string,
    nextStatus: ScoreValidationStatus
  ) => {
    await onUpdateScoreValidation(scoreId, nextStatus);
    if (selectedPlayerId) {
      await loadPlayerDetails(selectedPlayerId);
    }
    await loadPlayers();
  };

  const statusTextClass = (status: string) => {
    if (status === 'active' || status === 'valid' || status === 'approved') {
      return 'text-[#166534]';
    }
    if (status === 'flagged' || status === 'pending' || status === 'contacted') {
      return 'text-[#B45309]';
    }
    return 'text-[#991B1B]';
  };

  // Player Details View
  if (selectedPlayerId) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedPlayerId(null);
              onClearInitialPlayer?.();
            }}
            className="min-h-[40px] px-4 py-2 rounded-xl border border-[#DED9CA] bg-white hover:bg-[#ECE8DC] text-xs font-bold text-[#143B2B] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Players</span>
          </button>

          <button
            type="button"
            onClick={() => void loadPlayerDetails(selectedPlayerId)}
            disabled={detailsLoading}
            className="min-h-[40px] px-4 py-2 rounded-xl border border-[#DED9CA] bg-white hover:bg-[#ECE8DC] text-xs font-semibold text-[#143B2B] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${detailsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Profile</span>
          </button>
        </div>

        {detailsLoading && !details ? (
          <div className="rounded-xl border border-[#DED9CA] bg-white p-8 text-center text-sm text-[#556960]">
            Loading player profile, scores, and competition rankings...
          </div>
        ) : detailsError ? (
          <div className="rounded-xl border border-[#EF4444]/40 bg-[#FEE2E2] p-5 text-sm text-[#991B1B]">
            {detailsError}
          </div>
        ) : details ? (
          <>
            {/* Player Profile & Status Actions */}
            <div className="rounded-xl border border-[#DED9CA] bg-white p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <h2 className="font-display text-2xl font-bold text-[#143B2B]">
                      {details.player.nickname}
                    </h2>
                    <span
                      className={`text-xs font-mono font-bold uppercase ${statusTextClass(
                        details.player.status
                      )}`}
                    >
                      Status: {details.player.status}
                    </span>
                  </div>
                  <p className="font-mono text-sm font-semibold text-[#1B231F] tabular-nums">
                    Private Phone: {details.player.phoneNumberNormalized}{' '}
                    <span className="text-xs font-sans font-normal text-[#556960]">
                      · Unverified (SMS/OTP verification is disabled)
                    </span>
                  </p>
                  <p className="text-xs text-[#556960] tabular-nums">
                    Registered: {formatCompetitionDateTime(details.player.createdAt)} ·
                    Last Activity:{' '}
                    {formatCompetitionDateTime(details.player.lastActivityAt)} ({COMPETITION_TIMEZONE})
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {details.player.status !== 'active' && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleStatusChange(details.player.id, 'active')
                      }
                      className="min-h-[40px] px-3.5 py-2 rounded-lg border border-[#16A34A]/40 bg-white hover:bg-[#DCFCE7] text-xs font-bold text-[#166534] whitespace-nowrap cursor-pointer"
                    >
                      Activate Account
                    </button>
                  )}
                  {details.player.status !== 'flagged' && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleStatusChange(details.player.id, 'flagged')
                      }
                      className="min-h-[40px] px-3.5 py-2 rounded-lg border border-[#D97706]/50 bg-white hover:bg-[#FEF3C7] text-xs font-bold text-[#B45309] whitespace-nowrap cursor-pointer"
                    >
                      Flag Account
                    </button>
                  )}
                  {details.player.status !== 'suspended' && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleStatusChange(details.player.id, 'suspended')
                      }
                      className="min-h-[40px] px-3.5 py-2 rounded-lg border border-[#EF4444]/40 bg-white hover:bg-[#FEE2E2] text-xs font-bold text-[#991B1B] whitespace-nowrap cursor-pointer"
                    >
                      Suspend Account
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#ECE8DC] text-xs tabular-nums">
                <div>
                  <span className="text-[#556960]">Total Attempts</span>
                  <div className="mt-0.5 font-mono text-lg font-bold text-[#143B2B]">
                    {details.player.totalRuns}
                  </div>
                </div>
                <div>
                  <span className="text-[#556960]">Valid / Flagged</span>
                  <div className="mt-0.5 font-mono text-lg font-bold text-[#143B2B]">
                    {details.player.validRuns} / {details.player.flaggedRuns}
                  </div>
                </div>
                <div>
                  <span className="text-[#556960]">Highest Score</span>
                  <div className="mt-0.5 font-mono text-lg font-bold text-[#143B2B]">
                    {details.player.highestScore.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-[#556960]">Overall Points (Today / Week)</span>
                  <div className="mt-0.5 font-mono text-lg font-bold text-[#143B2B]">
                    {details.rankings.dailyOverall.totalPoints} /{' '}
                    {details.rankings.weeklyOverall.totalPoints}
                  </div>
                </div>
              </div>
            </div>

            {/* Daily & Weekly Rankings */}
            <div className="rounded-xl border border-[#DED9CA] bg-white p-5 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-bold text-[#143B2B]">
                  Daily & Weekly Rankings
                </h3>
                <span className="text-xs font-mono text-[#556960] tabular-nums">
                  Overall Rank Today:{' '}
                  {details.rankings.dailyOverall.rank
                    ? `#${details.rankings.dailyOverall.rank}`
                    : 'Unranked'}{' '}
                  · This Week:{' '}
                  {details.rankings.weeklyOverall.rank
                    ? `#${details.rankings.weeklyOverall.rank}`
                    : 'Unranked'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-[#E5E0D2] text-[11px] font-mono text-[#556960]">
                      <th className="py-2 pr-3">Game</th>
                      <th className="py-2 px-3">Daily Rank</th>
                      <th className="py-2 px-3">Daily Best</th>
                      <th className="py-2 px-3">Weekly Rank</th>
                      <th className="py-2 px-3">Weekly Best</th>
                      <th className="py-2 pl-3 text-right">All-Time Best</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EDE2]">
                    {details.rankings.perGame.map((g) => (
                      <tr key={g.gameId}>
                        <td className="py-2.5 pr-3 font-semibold text-[#143B2B]">
                          {g.gameName}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {g.dailyRank ? `#${g.dailyRank}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {g.dailyBestScore !== null
                            ? g.dailyBestScore.toLocaleString()
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {g.weeklyRank ? `#${g.weeklyRank}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {g.weeklyBestScore !== null
                            ? g.weeklyBestScore.toLocaleString()
                            : '—'}
                        </td>
                        <td className="py-2.5 pl-3 text-right font-mono font-bold text-[#143B2B]">
                          {g.allTimeBestScore.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Competition History */}
            <div className="rounded-xl border border-[#DED9CA] bg-white p-5 space-y-3">
              <h3 className="font-display text-base font-bold text-[#143B2B]">
                Competition History ({details.competitionHistory.length})
              </h3>
              {details.competitionHistory.length === 0 ? (
                <p className="text-xs sm:text-sm text-[#556960]">
                  This player has no runs tied to scheduled competitions yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {details.competitionHistory.map((c) => (
                    <div
                      key={c.competitionId}
                      className="rounded-lg border border-[#E5E0D2] bg-[#FAF8F2] p-3.5 space-y-1.5 text-xs"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-display text-sm font-bold text-[#143B2B]">
                          {c.competitionName}
                        </span>
                        <span className="font-mono text-[#556960] tabular-nums">
                          {c.competitionType.toUpperCase()} · {c.status} ·{' '}
                          {c.attemptsCount} runs · Best{' '}
                          {c.bestValidScore.toLocaleString()}
                        </span>
                      </div>
                      {c.winnerRecords.length > 0 && (
                        <div className="pt-1 border-t border-[#E5E0D2] space-y-1">
                          {c.winnerRecords.map((w) => (
                            <div
                              key={w.id}
                              className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]"
                            >
                              <span>
                                {w.winnerType === 'overall'
                                  ? 'Overall Champion'
                                  : w.gameName ?? 'Game'}{' '}
                                #{w.rank} ({w.competitionPoints} pts)
                              </span>
                              <span className={statusTextClass(w.approvalStatus)}>
                                Approval: {w.approvalStatus} · Prize: {w.prizeStatus}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All Player Scores */}
            <div className="rounded-xl border border-[#DED9CA] bg-white p-5 space-y-3">
              <h3 className="font-display text-base font-bold text-[#143B2B]">
                All Score Attempts ({details.scores.length})
              </h3>
              {details.scores.length === 0 ? (
                <p className="text-xs sm:text-sm text-[#556960]">
                  No score submissions recorded for this player yet.
                </p>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="md:hidden space-y-2.5">
                    {details.scores.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-lg border border-[#E5E0D2] bg-[#FAF8F2] p-3 space-y-2 text-xs"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-bold text-[#143B2B]">
                            {s.gameName}
                          </span>
                          <span className="font-mono text-base font-bold text-[#143B2B] tabular-nums">
                            {s.score.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[#556960] font-mono tabular-nums">
                          {formatCompetitionDateTime(s.playedAt)} ·{' '}
                          {s.competitionPeriodLabel}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-semibold ${statusTextClass(
                              s.validationStatus
                            )}`}
                          >
                            {s.validationStatus}
                            {s.validationReason ? ` — ${s.validationReason}` : ''}
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleScoreModeration(s.id, 'valid')}
                              className="px-2 py-1 rounded border border-[#16A34A]/40 text-[11px] font-semibold text-[#166534]"
                            >
                              Valid
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleScoreModeration(s.id, 'flagged')}
                              className="px-2 py-1 rounded border border-[#D97706]/40 text-[11px] font-semibold text-[#B45309]"
                            >
                              Flag
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void handleScoreModeration(s.id, 'rejected')
                              }
                              className="px-2 py-1 rounded border border-[#EF4444]/40 text-[11px] font-semibold text-[#991B1B]"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm tabular-nums">
                      <thead>
                        <tr className="border-b border-[#E5E0D2] text-[11px] font-mono text-[#556960]">
                          <th className="py-2 pr-3">Game</th>
                          <th className="py-2 px-3">Score</th>
                          <th className="py-2 px-3">Submitted (EAT)</th>
                          <th className="py-2 px-3">Period</th>
                          <th className="py-2 px-3">Validation</th>
                          <th className="py-2 pl-3 text-right">Moderation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0EDE2]">
                        {details.scores.map((s) => (
                          <tr key={s.id}>
                            <td className="py-2 pr-3 font-semibold text-[#143B2B]">
                              {s.gameName}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold">
                              {s.score.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 font-mono text-xs text-[#556960]">
                              {formatCompetitionDateTime(s.playedAt)}
                            </td>
                            <td className="py-2 px-3 text-xs text-[#556960]">
                              {s.competitionPeriodLabel}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`font-semibold ${statusTextClass(
                                  s.validationStatus
                                )}`}
                              >
                                {s.validationStatus}
                              </span>
                              {s.validationReason && (
                                <div className="text-[11px] text-[#556960]">
                                  {s.validationReason}
                                </div>
                              )}
                            </td>
                            <td className="py-2 pl-3 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => void handleScoreModeration(s.id, 'valid')}
                                className="px-2.5 py-1 rounded-lg border border-[#16A34A]/40 text-xs font-semibold text-[#166534] cursor-pointer"
                              >
                                Valid
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleScoreModeration(s.id, 'flagged')
                                }
                                className="px-2.5 py-1 rounded-lg border border-[#D97706]/50 text-xs font-semibold text-[#B45309] cursor-pointer"
                              >
                                Flag
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleScoreModeration(s.id, 'rejected')
                                }
                                className="px-2.5 py-1 rounded-lg border border-[#EF4444]/40 text-xs font-semibold text-[#991B1B] cursor-pointer"
                              >
                                Reject
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  // Player Directory View
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#DED9CA] bg-white p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-[#143B2B]">
              Registered Arcade Players ({players.length})
            </h2>
            <p className="text-xs text-[#556960]">
              Admin-only contact directory. Phone numbers are normalized (+251) and
              marked unverified because SMS/OTP verification is disabled.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadPlayers()}
            disabled={loading}
            className="self-start min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#DED9CA] bg-[#FAF8F2] hover:bg-[#ECE8DC] text-xs font-semibold text-[#143B2B] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-[#ECE8DC]"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#556960] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by nickname or Ethiopian phone (e.g. 0911 or +251...)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-[#D4CFC0] pl-9 pr-3 py-2 text-xs sm:text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | PlayerStatus)}
            aria-label="Filter by player status"
            className="min-h-[42px] rounded-xl border border-[#D4CFC0] px-3 py-2 text-xs sm:text-sm bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="flagged">Flagged</option>
            <option value="suspended">Suspended</option>
          </select>

          <button
            type="submit"
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#143B2B] hover:bg-[#1D523B] text-xs sm:text-sm font-bold text-[#CEF04E] whitespace-nowrap cursor-pointer"
          >
            Search
          </button>

          {(appliedSearch || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setAppliedSearch('');
                setStatusFilter('all');
              }}
              className="min-h-[42px] px-3 py-2 rounded-xl border border-[#D4CFC0] bg-white text-xs font-semibold text-[#556960] whitespace-nowrap cursor-pointer"
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-[#EF4444]/40 bg-[#FEE2E2] p-5 text-sm text-[#991B1B]">
          {errorMsg}
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-[#DED9CA] bg-white p-8 text-center text-sm text-[#556960]">
          Loading registered arcade players...
        </div>
      ) : players.length === 0 ? (
        <div className="rounded-xl border border-[#DED9CA] bg-white p-8 text-center space-y-1.5">
          <p className="font-display text-base font-bold text-[#143B2B]">
            No Matching Players Found
          </p>
          <p className="text-xs sm:text-sm text-[#556960]">
            Players appear here automatically after submitting their nickname and phone
            number in the POPO Arcade registration modal.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3">
            {players.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-[#DED9CA] bg-white p-4 space-y-2.5 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-bold text-[#143B2B]">
                      {p.nickname}
                    </p>
                    <p className="font-mono text-[#1B231F] tabular-nums">
                      {p.phoneNumberNormalized}{' '}
                      <span className="font-sans text-[#556960]">(unverified)</span>
                    </p>
                  </div>
                  <span
                    className={`font-mono font-bold uppercase ${statusTextClass(
                      p.status
                    )}`}
                  >
                    {p.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#ECE8DC] text-[11px] text-[#556960] tabular-nums">
                  <div>
                    Registered:{' '}
                    <span className="text-[#1B231F]">
                      {formatCompetitionDateTime(p.createdAt)}
                    </span>
                  </div>
                  <div>
                    Last Active:{' '}
                    <span className="text-[#1B231F]">
                      {formatCompetitionDateTime(p.lastActivityAt)}
                    </span>
                  </div>
                  <div>
                    Games Played:{' '}
                    <span className="font-mono font-bold text-[#143B2B]">
                      {p.totalRuns}
                    </span>
                  </div>
                  <div>
                    Highest Score:{' '}
                    <span className="font-mono font-bold text-[#143B2B]">
                      {p.highestScore.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#ECE8DC]">
                  <button
                    type="button"
                    onClick={() => setSelectedPlayerId(p.id)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#143B2B] text-xs font-bold text-[#CEF04E] cursor-pointer"
                  >
                    Player Details
                  </button>
                  {p.status !== 'active' && (
                    <button
                      type="button"
                      onClick={() => void handleStatusChange(p.id, 'active')}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#16A34A]/40 text-xs font-semibold text-[#166534] cursor-pointer"
                    >
                      Activate
                    </button>
                  )}
                  {p.status !== 'flagged' && (
                    <button
                      type="button"
                      onClick={() => void handleStatusChange(p.id, 'flagged')}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#D97706]/50 text-xs font-semibold text-[#B45309] cursor-pointer"
                    >
                      Flag
                    </button>
                  )}
                  {p.status !== 'suspended' && (
                    <button
                      type="button"
                      onClick={() => void handleStatusChange(p.id, 'suspended')}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#EF4444]/40 text-xs font-semibold text-[#991B1B] cursor-pointer"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block rounded-xl border border-[#DED9CA] bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-[#E5E0D2] bg-[#FAF8F2] text-[11px] font-mono text-[#556960]">
                    <th className="py-2.5 px-4">Player</th>
                    <th className="py-2.5 px-3">Private Phone (Admin)</th>
                    <th className="py-2.5 px-3">Registered</th>
                    <th className="py-2.5 px-3">Games Played</th>
                    <th className="py-2.5 px-3">Highest Score</th>
                    <th className="py-2.5 px-3">Last Activity</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDE2]">
                  {players.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAF8F2]">
                      <td className="py-2.5 px-4 font-semibold text-[#143B2B]">
                        <button
                          type="button"
                          onClick={() => setSelectedPlayerId(p.id)}
                          className="hover:underline text-left font-bold cursor-pointer"
                        >
                          {p.nickname}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs">
                        <div>{p.phoneNumberNormalized}</div>
                        <div className="text-[10px] font-sans text-[#556960]">
                          unverified
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-[#556960]">
                        {formatCompetitionDateTime(p.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {p.totalRuns}{' '}
                        {p.flaggedRuns > 0 && (
                          <span className="text-xs text-[#B45309]">
                            ({p.flaggedRuns} flagged)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#143B2B]">
                        {p.highestScore.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-[#556960]">
                        {formatCompetitionDateTime(p.lastActivityAt)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-mono text-xs font-bold uppercase ${statusTextClass(
                            p.status
                          )}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedPlayerId(p.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#143B2B] text-xs font-bold text-[#CEF04E] cursor-pointer"
                        >
                          Details
                        </button>
                        {p.status !== 'active' && (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(p.id, 'active')}
                            className="px-2.5 py-1 rounded-lg border border-[#16A34A]/40 text-xs font-semibold text-[#166534] cursor-pointer"
                          >
                            Activate
                          </button>
                        )}
                        {p.status !== 'flagged' && (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(p.id, 'flagged')}
                            className="px-2.5 py-1 rounded-lg border border-[#D97706]/50 text-xs font-semibold text-[#B45309] cursor-pointer"
                          >
                            Flag
                          </button>
                        )}
                        {p.status !== 'suspended' && (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(p.id, 'suspended')}
                            className="px-2.5 py-1 rounded-lg border border-[#EF4444]/40 text-xs font-semibold text-[#991B1B] cursor-pointer"
                          >
                            Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
