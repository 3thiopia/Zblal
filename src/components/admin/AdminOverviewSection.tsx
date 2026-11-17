import { ArrowRight, RefreshCw } from 'lucide-react';
import { formatCompetitionDateTime, COMPETITION_TIMEZONE } from '../../arcade/arcadeConfig.ts';
import type { AdminOverviewResponse } from '../../services/arcadeClient.ts';

interface AdminOverviewSectionProps {
  overview: AdminOverviewResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onNavigateTab: (
    tab:
      | 'overview'
      | 'players'
      | 'scores'
      | 'daily'
      | 'weekly'
      | 'overall'
      | 'winners'
      | 'competitions'
  ) => void;
}

export function AdminOverviewSection({
  overview,
  loading,
  error,
  onRefresh,
  onNavigateTab,
}: AdminOverviewSectionProps) {
  if (error) {
    return (
      <div className="rounded-xl border border-[#EF4444]/40 bg-[#FEE2E2] p-5 space-y-3">
        <p className="text-sm font-semibold text-[#991B1B]">{error}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="min-h-[40px] px-4 py-2 rounded-lg bg-[#143B2B] text-xs font-bold text-[#CEF04E] whitespace-nowrap cursor-pointer"
        >
          Retry Overview Query
        </button>
      </div>
    );
  }

  if (loading && !overview) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            className="h-28 rounded-xl border border-[#DED9CA] bg-white p-4 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: 'Total Registered Players',
      value: overview?.totalPlayers ?? 0,
      meta: 'Unique accounts by +251 phone',
      actionLabel: 'Manage Players',
      tab: 'players' as const,
      tone: 'text-[#143B2B]',
    },
    {
      label: 'Total Game Attempts',
      value: overview?.totalAttempts ?? 0,
      meta: 'All recorded runs (valid & moderated)',
      actionLabel: 'Browse All Scores',
      tab: 'scores' as const,
      tone: 'text-[#143B2B]',
    },
    {
      label: 'Games Played Today',
      value: overview?.gamesPlayedToday ?? 0,
      meta: overview?.dailyWindow.label ?? 'Africa/Addis_Ababa',
      actionLabel: 'Daily Leaderboard',
      tab: 'daily' as const,
      tone: 'text-[#143B2B]',
    },
    {
      label: 'Unique Players Today',
      value: overview?.uniquePlayersToday ?? 0,
      meta: 'Distinct active players since 00:00 EAT',
      actionLabel: 'Today Overall',
      tab: 'overall' as const,
      tone: 'text-[#16A34A]',
    },
    {
      label: 'Unique Players This Week',
      value: overview?.uniquePlayersThisWeek ?? 0,
      meta: overview?.weeklyWindow.label ?? 'Mon–Sun EAT',
      actionLabel: 'Weekly Leaderboard',
      tab: 'weekly' as const,
      tone: 'text-[#143B2B]',
    },
    {
      label: 'Pending Winner Approvals',
      value: overview?.pendingWinnerApprovals ?? 0,
      meta: 'Requires manual phone verification',
      actionLabel: 'Review Winners',
      tab: 'winners' as const,
      tone:
        (overview?.pendingWinnerApprovals ?? 0) > 0
          ? 'text-[#D97706]'
          : 'text-[#143B2B]',
    },
    {
      label: 'Prizes Awaiting Distribution',
      value: overview?.prizesAwaitingDistribution ?? 0,
      meta: 'Approved winners not yet awarded',
      actionLabel: 'Fulfill Prizes',
      tab: 'winners' as const,
      tone:
        (overview?.prizesAwaitingDistribution ?? 0) > 0
          ? 'text-[#D97706]'
          : 'text-[#143B2B]',
    },
    {
      label: 'Active / Upcoming Contests',
      value: `${overview?.activeCompetitionsCount ?? 0} / ${
        overview?.upcomingCompetitionsCount ?? 0
      }`,
      meta: 'Scheduled daily & weekly events',
      actionLabel: 'Manage Contests',
      tab: 'competitions' as const,
      tone: 'text-[#143B2B]',
    },
  ];

  const popularGames = overview?.popularGames ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-[#143B2B]">
            Arcade Overview
          </h2>
          <p className="text-xs text-[#556960]">
            Live Supabase metrics anchored to {COMPETITION_TIMEZONE} timezone.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="min-h-[40px] px-4 py-2 rounded-xl border border-[#DED9CA] bg-white hover:bg-[#ECE8DC] text-xs font-semibold text-[#143B2B] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* 8 Live KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-[#DED9CA] bg-white p-4 flex flex-col justify-between gap-3"
          >
            <div>
              <p className="text-xs font-semibold text-[#556960]">{m.label}</p>
              <p
                className={`mt-1.5 font-mono text-2xl sm:text-3xl font-bold tabular-nums ${m.tone}`}
              >
                {typeof m.value === 'number' ? m.value.toLocaleString() : m.value}
              </p>
              <p className="mt-1 text-[11px] text-[#556960] truncate">{m.meta}</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab(m.tab)}
              className="self-start text-xs font-semibold text-[#143B2B] hover:underline inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <span>{m.actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Most Popular Games (Real Attempt Counts) */}
      <div className="rounded-xl border border-[#DED9CA] bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-bold text-[#143B2B]">
              Most Popular Games
            </h3>
            <p className="text-xs text-[#556960]">
              Calculated from all recorded score attempts in Supabase.
            </p>
          </div>
          {overview && (
            <span className="text-xs font-mono text-[#556960] tabular-nums">
              Daily window:{' '}
              {formatCompetitionDateTime(overview.dailyWindow.startsAt)} –{' '}
              {formatCompetitionDateTime(overview.dailyWindow.endsAt)} EAT
            </span>
          )}
        </div>

        {popularGames.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#556960] space-y-2 border-t border-[#ECE8DC]">
            <p>No arcade game attempts recorded yet.</p>
            <p className="text-xs">
              Metrics will populate automatically as players register and submit runs.
            </p>
          </div>
        ) : (
          <div className="space-y-3 border-t border-[#ECE8DC] pt-4">
            {popularGames.map((game) => (
              <div key={game.gameId} className="space-y-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs sm:text-sm">
                  <span className="font-display font-bold text-[#143B2B]">
                    {game.gameName}
                  </span>
                  <span className="font-mono text-xs text-[#556960] tabular-nums">
                    {game.totalAttempts.toLocaleString()} attempts ·{' '}
                    {game.validAttempts.toLocaleString()} valid ·{' '}
                    {game.uniquePlayers.toLocaleString()} players ({game.sharePercent}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-sm bg-[#ECE8DC] overflow-hidden">
                  <div
                    className="h-full bg-[#143B2B]"
                    style={{ width: `${Math.max(4, game.sharePercent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
