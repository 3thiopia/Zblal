import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import {
  ARCADE_GAMES,
  COMPETITION_TIMEZONE,
  formatCompetitionDateTime,
  type DateRangePreset,
  type ScoreValidationStatus,
} from '../../arcade/arcadeConfig.ts';
import {
  adminQueryAllScores,
  type AdminAllScoresResponse,
} from '../../services/arcadeClient.ts';

interface AdminScoresSectionProps {
  authToken: string;
  onInspectPlayer: (playerId: string) => void;
  onUpdateScoreValidation: (
    scoreId: string,
    status: ScoreValidationStatus
  ) => Promise<void>;
}

const DATE_PRESETS: Array<{ id: DateRangePreset; label: string }> = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' },
];

export function AdminScoresSection({
  authToken,
  onInspectPlayer,
  onUpdateScoreValidation,
}: AdminScoresSectionProps) {
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [gameId, setGameId] = useState<string>('all');
  const [validationStatus, setValidationStatus] = useState<string>('all');
  const [playerSearchInput, setPlayerSearchInput] = useState('');
  const [appliedPlayerSearch, setAppliedPlayerSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'highest_score'>('newest');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<AdminAllScoresResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadScores = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await adminQueryAllScores(authToken, {
        datePreset,
        startDate: datePreset === 'custom' ? startDate : undefined,
        endDate: datePreset === 'custom' ? endDate : undefined,
        gameId,
        playerSearch: appliedPlayerSearch || undefined,
        validationStatus,
        sortBy,
        page,
        pageSize: 25,
      });
      setData(res);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to load score history.'
      );
    } finally {
      setLoading(false);
    }
  }, [
    appliedPlayerSearch,
    authToken,
    datePreset,
    endDate,
    gameId,
    page,
    sortBy,
    startDate,
    validationStatus,
  ]);

  useEffect(() => {
    void loadScores();
  }, [loadScores]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedPlayerSearch(playerSearchInput.trim());
  };

  const handleModerate = async (scoreId: string, nextStatus: ScoreValidationStatus) => {
    await onUpdateScoreValidation(scoreId, nextStatus);
    await loadScores();
  };

  const statusColor = (status: ScoreValidationStatus) => {
    if (status === 'valid') return 'text-[#166534]';
    if (status === 'flagged') return 'text-[#B45309]';
    return 'text-[#991B1B]';
  };

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      {/* Header & Filter Bar */}
      <div className="rounded-xl border border-[#DED9CA] bg-white p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-[#143B2B]">
              All Score Attempts ({(data?.totalCount ?? 0).toLocaleString()})
            </h2>
            <p className="text-xs text-[#556960]">
              Every score submission is preserved for historical audit ({COMPETITION_TIMEZONE}).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadScores()}
            disabled={loading}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#DED9CA] bg-[#FAF8F2] hover:bg-[#ECE8DC] text-xs font-semibold text-[#143B2B] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Date Preset Segmented Control */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#ECE8DC]">
          {DATE_PRESETS.map((preset) => {
            const active = datePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setDatePreset(preset.id);
                  setPage(1);
                }}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#143B2B] text-[#CEF04E]'
                    : 'bg-[#FAF8F2] border border-[#E5E0D2] text-[#143B2B] hover:bg-[#ECE8DC]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {datePreset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FAF8F2] p-3 rounded-lg border border-[#E5E0D2]">
            <div>
              <label className="block text-[11px] font-semibold text-[#556960] mb-1">
                From Date (EAT)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full min-h-[38px] rounded-lg border border-[#D4CFC0] bg-white px-3 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#556960] mb-1">
                To Date (EAT, inclusive)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full min-h-[38px] rounded-lg border border-[#D4CFC0] bg-white px-3 py-1.5 text-xs"
              />
            </div>
          </div>
        )}

        {/* Game, Player Search, Validation, Sort */}
        <form
          onSubmit={handleSearchSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5"
        >
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-[#556960] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter player nickname or phone..."
              value={playerSearchInput}
              onChange={(e) => setPlayerSearchInput(e.target.value)}
              className="w-full min-h-[40px] rounded-xl border border-[#D4CFC0] pl-9 pr-3 py-1.5 text-xs sm:text-sm"
            />
          </div>

          <select
            value={gameId}
            onChange={(e) => {
              setGameId(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by game"
            className="lg:col-span-2 min-h-[40px] rounded-xl border border-[#D4CFC0] px-3 py-1.5 text-xs sm:text-sm bg-white"
          >
            <option value="all">All Games</option>
            {ARCADE_GAMES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <select
            value={validationStatus}
            onChange={(e) => {
              setValidationStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by validation status"
            className="lg:col-span-2 min-h-[40px] rounded-xl border border-[#D4CFC0] px-3 py-1.5 text-xs sm:text-sm bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="valid">Valid</option>
            <option value="flagged">Flagged</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as 'newest' | 'highest_score');
              setPage(1);
            }}
            aria-label="Sort score attempts"
            className="lg:col-span-2 min-h-[40px] rounded-xl border border-[#D4CFC0] px-3 py-1.5 text-xs sm:text-sm bg-white"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="highest_score">Sort: Highest Score</option>
          </select>

          <button
            type="submit"
            className="lg:col-span-2 min-h-[40px] px-4 py-1.5 rounded-xl bg-[#143B2B] hover:bg-[#1D523B] text-xs font-bold text-[#CEF04E] whitespace-nowrap cursor-pointer"
          >
            Apply Filters
          </button>
        </form>
      </div>

      {/* Results Area */}
      {errorMsg ? (
        <div className="rounded-xl border border-[#EF4444]/40 bg-[#FEE2E2] p-5 text-sm text-[#991B1B]">
          {errorMsg}
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-[#DED9CA] bg-white p-8 text-center text-sm text-[#556960]">
          Loading score history...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-[#DED9CA] bg-white p-8 text-center space-y-1.5">
          <p className="font-display text-base font-bold text-[#143B2B]">
            No Score Submissions Match These Filters
          </p>
          <p className="text-xs sm:text-sm text-[#556960]">
            Adjust your date window, game filter, or validation status to view recorded runs.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-2.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#DED9CA] bg-white p-4 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <button
                      type="button"
                      onClick={() => onInspectPlayer(item.playerId)}
                      className="font-display text-base font-bold text-[#143B2B] hover:underline text-left cursor-pointer"
                    >
                      {item.nickname}
                    </button>
                    <p className="text-[#556960]">
                      {item.gameName} · {item.competitionPeriodLabel}
                    </p>
                  </div>
                  <span className="font-mono text-lg font-bold text-[#143B2B] tabular-nums">
                    {item.score.toLocaleString()}
                  </span>
                </div>

                <div className="font-mono text-[11px] text-[#556960] tabular-nums">
                  {formatCompetitionDateTime(item.playedAt)} ·{' '}
                  {item.durationMs ? `${(item.durationMs / 1000).toFixed(1)}s` : '—'}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#ECE8DC]">
                  <span className={`font-semibold ${statusColor(item.validationStatus)}`}>
                    {item.validationStatus}
                    {item.validationReason ? ` — ${item.validationReason}` : ''}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleModerate(item.id, 'valid')}
                      className="px-2.5 py-1 rounded border border-[#16A34A]/40 text-[11px] font-semibold text-[#166534]"
                    >
                      Valid
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleModerate(item.id, 'flagged')}
                      className="px-2.5 py-1 rounded border border-[#D97706]/50 text-[11px] font-semibold text-[#B45309]"
                    >
                      Flag
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleModerate(item.id, 'rejected')}
                      className="px-2.5 py-1 rounded border border-[#EF4444]/40 text-[11px] font-semibold text-[#991B1B]"
                    >
                      Reject
                    </button>
                  </div>
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
                    <th className="py-2.5 px-4">Player</th>
                    <th className="py-2.5 px-3">Game</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Submitted (EAT)</th>
                    <th className="py-2.5 px-3">Competition Period</th>
                    <th className="py-2.5 px-3">Validation</th>
                    <th className="py-2.5 px-4 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDE2]">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FAF8F2]">
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => onInspectPlayer(item.playerId)}
                          className="font-semibold text-[#143B2B] hover:underline text-left cursor-pointer"
                        >
                          {item.nickname}
                        </button>
                        <div className="font-mono text-[11px] text-[#556960]">
                          {item.phoneNumber}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-medium">{item.gameName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#143B2B]">
                        {item.score.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-[#556960]">
                        {formatCompetitionDateTime(item.playedAt)}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#556960]">
                        {item.competitionPeriodLabel}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-semibold ${statusColor(
                            item.validationStatus
                          )}`}
                        >
                          {item.validationStatus}
                        </span>
                        {item.validationReason && (
                          <div className="text-[11px] text-[#556960] max-w-[220px]">
                            {item.validationReason}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => void handleModerate(item.id, 'valid')}
                          className="px-2.5 py-1 rounded-lg border border-[#16A34A]/40 text-xs font-semibold text-[#166534] cursor-pointer"
                        >
                          Valid
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleModerate(item.id, 'flagged')}
                          className="px-2.5 py-1 rounded-lg border border-[#D97706]/50 text-xs font-semibold text-[#B45309] cursor-pointer"
                        >
                          Flag
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleModerate(item.id, 'rejected')}
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
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#DED9CA] bg-white px-4 py-3 text-xs tabular-nums">
              <span className="font-mono text-[#556960]">
                Page {data.page} of {data.totalPages} ·{' '}
                {data.totalCount.toLocaleString()} total scores
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="min-h-[36px] px-3 py-1 rounded-lg border border-[#D4CFC0] bg-white disabled:opacity-40 font-semibold text-[#143B2B] inline-flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="min-h-[36px] px-3 py-1 rounded-lg border border-[#D4CFC0] bg-white disabled:opacity-40 font-semibold text-[#143B2B] inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
