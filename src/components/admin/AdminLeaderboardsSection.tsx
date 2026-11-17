import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  COMPETITION_TIMEZONE,
  PLACEMENT_POINTS_TABLE,
  formatCompetitionDateTime,
  type ArcadeCompetition,
  type LeaderboardPeriod,
} from '../../arcade/arcadeConfig.ts';
import {
  adminFetchLeaderboards,
  type AdminLeaderboardsResponse,
} from '../../services/arcadeClient.ts';

interface AdminLeaderboardsSectionProps {
  authToken: string;
  mode: 'daily' | 'weekly' | 'overall';
  competitions: ArcadeCompetition[];
  onInspectPlayer: (playerId: string) => void;
}

export function AdminLeaderboardsSection({
  authToken,
  mode,
  competitions,
  onInspectPlayer,
}: AdminLeaderboardsSectionProps) {
  const [overallPeriod, setOverallPeriod] = useState<LeaderboardPeriod>('daily');
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [data, setData] = useState<AdminLeaderboardsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectivePeriod: LeaderboardPeriod =
    mode === 'daily' ? 'daily' : mode === 'weekly' ? 'weekly' : overallPeriod;

  const loadLeaderboards = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await adminFetchLeaderboards(authToken, {
        period: effectivePeriod,
        competitionId:
          mode === 'overall' && selectedCompId ? selectedCompId : undefined,
      });
      setData(res);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to load leaderboards.'
      );
    } finally {
      setLoading(false);
    }
  }, [authToken, effectivePeriod, mode, selectedCompId]);

  useEffect(() => {
    void loadLeaderboards();
  }, [loadLeaderboards]);

  const title =
    mode === 'daily'
      ? 'Daily Leaderboard'
      : mode === 'weekly'
      ? 'Weekly Leaderboard'
      : 'Overall Champion Standings';

  const subtitle =
    mode === 'daily'
      ? `Separate rankings per game using only each player's highest valid run today (${COMPETITION_TIMEZONE}).`
      : mode === 'weekly'
      ? `Weekly competition rankings separated per game in ${COMPETITION_TIMEZONE} timezone.`
      : 'Calculated from placement points across eligible games. Raw scores from different games are never added together.';

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="rounded-xl border border-[#DED9CA] bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#143B2B]">
              {title}
            </h2>
            <p className="text-xs text-[#556960]">{subtitle}</p>
            {data && (
              <p className="mt-1 text-xs font-mono text-[#143B2B] tabular-nums">
                Window: {data.periodLabel}
                {data.startsAt && data.endsAt
                  ? ` (${formatCompetitionDateTime(
                      data.startsAt
                    )} → ${formatCompetitionDateTime(data.endsAt)} EAT)`
                  : ''}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => void loadLeaderboards()}
            disabled={loading}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#DED9CA] bg-[#FAF8F2] hover:bg-[#ECE8DC] text-xs font-semibold text-[#143B2B] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {mode === 'overall' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#ECE8DC]">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'daily', label: 'Daily' },
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'all_time', label: 'All-Time' },
                ] as const
              ).map((pt) => {
                const active = !selectedCompId && overallPeriod === pt.id;
                return (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => {
                      setSelectedCompId('');
                      setOverallPeriod(pt.id);
                    }}
                    className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[#143B2B] text-[#CEF04E]'
                        : 'bg-[#FAF8F2] border border-[#E5E0D2] text-[#143B2B]'
                    }`}
                  >
                    {pt.label}
                  </button>
                );
              })}
            </div>

            {competitions.length > 0 && (
              <select
                value={selectedCompId}
                onChange={(e) => setSelectedCompId(e.target.value)}
                aria-label="Filter Overall Champion by scheduled competition"
                className="min-h-[38px] rounded-xl border border-[#D4CFC0] px-3 py-1.5 text-xs bg-white max-w-xs"
              >
                <option value="">Use live {overallPeriod} window</option>
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.competitionType})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-[#EF4444]/40 bg-[#FEE2E2] p-5 text-sm text-[#991B1B]">
          {errorMsg}
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-[#DED9CA] bg-white p-8 text-center text-sm text-[#556960]">
          Calculating standings from Supabase...
        </div>
      ) : mode === 'overall' ? (
        <div className="space-y-4">
          {/* Placement Points Legend */}
          <div className="rounded-xl border border-[#DED9CA] bg-white p-4 text-xs text-[#556960] flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="font-semibold text-[#143B2B]">
              Placement Points per Eligible Game:
            </span>
            {PLACEMENT_POINTS_TABLE.map((row) => (
              <span key={row.rank} className="font-mono tabular-nums">
                {row.label}: <strong className="text-[#143B2B]">{row.points} pts</strong>
              </span>
            ))}
            <span className="font-mono">6th+: 0 pts</span>
          </div>

          {(data?.overall ?? []).length === 0 ? (
            <div className="rounded-xl border border-[#DED9CA] bg-white p-8 text-center text-sm text-[#556960]">
              No valid scores recorded in this window yet.
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-2.5">
                {data!.overall.map((row) => (
                  <div
                    key={row.playerId}
                    className="rounded-xl border border-[#DED9CA] bg-white p-4 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-[#143B2B]">
                          #{row.rank}
                        </span>{' '}
                        <button
                          type="button"
                          onClick={() => onInspectPlayer(row.playerId)}
                          className="font-display text-base font-bold text-[#143B2B] hover:underline cursor-pointer"
                        >
                          {row.nickname}
                        </button>
                        <div className="font-mono text-[#556960] tabular-nums">
                          {row.maskedPhone}
                        </div>
                      </div>
                      <span className="font-mono text-base font-bold text-[#143B2B] tabular-nums">
                        {row.totalPoints} pts
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#ECE8DC] text-[11px] text-[#556960] tabular-nums">
                      {row.breakdown
                        .map(
                          (b) =>
                            `${b.gameName}: #${b.rank} (${b.bestScore.toLocaleString()} · ${
                              b.points
                            } pts)`
                        )
                        .join(' · ')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block rounded-xl border border-[#DED9CA] bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm tabular-nums">
                    <thead>
                      <tr className="border-b border-[#E5E0D2] bg-[#FAF8F2] text-[11px] font-mono text-[#556960]">
                        <th className="py-2.5 px-4">Overall Rank</th>
                        <th className="py-2.5 px-3">Nickname</th>
                        <th className="py-2.5 px-3">Masked Phone</th>
                        <th className="py-2.5 px-3">Individual Game Placements</th>
                        <th className="py-2.5 px-4 text-right">Total Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EDE2]">
                      {data!.overall.map((row) => (
                        <tr key={row.playerId} className="hover:bg-[#FAF8F2]">
                          <td className="py-2.5 px-4 font-mono font-bold text-[#143B2B]">
                            #{row.rank}
                          </td>
                          <td className="py-2.5 px-3 font-semibold">
                            <button
                              type="button"
                              onClick={() => onInspectPlayer(row.playerId)}
                              className="text-[#143B2B] hover:underline cursor-pointer"
                            >
                              {row.nickname}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs text-[#556960]">
                            {row.maskedPhone}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-[#556960]">
                            {row.breakdown
                              .map(
                                (b) =>
                                  `${b.gameName}: #${b.rank} (${b.bestScore.toLocaleString()} · ${
                                    b.points
                                  } pts)`
                              )
                              .join(' · ')}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-[#143B2B]">
                            {row.totalPoints} pts
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
      ) : (
        /* Separate Per-Game Leaderboards for Daily / Weekly */
        <div className="space-y-5">
          {(data?.perGame ?? []).map((gameGroup) => (
            <div
              key={gameGroup.gameId}
              className="rounded-xl border border-[#DED9CA] bg-white overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[#E5E0D2] bg-[#FAF8F2] flex items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-bold text-[#143B2B]">
                  {gameGroup.gameName}
                </h3>
                <span className="font-mono text-xs text-[#556960] tabular-nums">
                  {gameGroup.entries.length} ranked player
                  {gameGroup.entries.length === 1 ? '' : 's'}
                </span>
              </div>

              {gameGroup.entries.length === 0 ? (
                <div className="p-6 text-center text-xs sm:text-sm text-[#556960]">
                  No valid scores recorded for {gameGroup.gameName} in this{' '}
                  {mode === 'daily' ? 'daily' : 'weekly'} window yet.
                </div>
              ) : (
                <>
                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-[#F0EDE2]">
                    {gameGroup.entries.map((entry) => (
                      <div
                        key={entry.playerId}
                        className="p-3.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono font-bold text-[#143B2B]">
                              #{entry.rank}
                            </span>
                            <button
                              type="button"
                              onClick={() => onInspectPlayer(entry.playerId)}
                              className="font-display text-sm font-bold text-[#143B2B] hover:underline truncate cursor-pointer"
                            >
                              {entry.nickname}
                            </button>
                          </div>
                          <div className="font-mono text-[11px] text-[#556960] tabular-nums">
                            {entry.maskedPhone} · {entry.gameName} ·{' '}
                            {formatCompetitionDateTime(entry.playedAt)}
                          </div>
                        </div>
                        <span className="font-mono text-base font-bold text-[#143B2B] tabular-nums shrink-0">
                          {entry.bestScore.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm tabular-nums">
                      <thead>
                        <tr className="border-b border-[#E5E0D2] text-[11px] font-mono text-[#556960]">
                          <th className="py-2 px-4">Rank</th>
                          <th className="py-2 px-3">Nickname</th>
                          <th className="py-2 px-3">Masked Phone</th>
                          <th className="py-2 px-3">Game</th>
                          <th className="py-2 px-3">Submission Time (EAT)</th>
                          <th className="py-2 px-4 text-right">Best Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0EDE2]">
                        {gameGroup.entries.map((entry) => (
                          <tr key={entry.playerId} className="hover:bg-[#FAF8F2]">
                            <td className="py-2.5 px-4 font-mono font-bold text-[#143B2B]">
                              #{entry.rank}
                            </td>
                            <td className="py-2.5 px-3 font-semibold">
                              <button
                                type="button"
                                onClick={() => onInspectPlayer(entry.playerId)}
                                className="text-[#143B2B] hover:underline cursor-pointer"
                              >
                                {entry.nickname}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-xs text-[#556960]">
                              {entry.maskedPhone}
                            </td>
                            <td className="py-2.5 px-3 text-xs text-[#556960]">
                              {entry.gameName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-xs text-[#556960]">
                              {formatCompetitionDateTime(entry.playedAt)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-[#143B2B]">
                              {entry.bestScore.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
