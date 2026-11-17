import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Crown,
  LayoutDashboard,
  ListOrdered,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import {
  ARCADE_GAMES,
  COMPETITION_TIMEZONE,
  formatCompetitionDateTime,
  getAddisAbabaDailyWindow,
  getAddisAbabaWeeklyWindow,
  type AdminWinnerRecord,
  type ArcadeCompetition,
  type ArcadeGameId,
  type CompetitionStatus,
  type PlayerStatus,
  type ScoreValidationStatus,
} from '../arcade/arcadeConfig.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import {
  adminCreateCompetition,
  adminFetchHistoricalWinners,
  adminFetchOverview,
  adminGetCompetitionWinners,
  adminListCompetitions,
  adminReviewWinner,
  adminSnapshotWinners,
  adminUpdateCompetition,
  adminUpdatePlayerStatus,
  adminUpdateScoreValidation,
  checkAdminSession,
  checkArcadeSchemaStatus,
  getAdminAuthConfig,
  loginAdminWithPasscode,
  type AdminCompetitionWinnersResponse,
  type AdminHistoricalWinnersGroup,
  type AdminOverviewResponse,
} from '../services/arcadeClient.ts';
import { AdminLeaderboardsSection } from './admin/AdminLeaderboardsSection.tsx';
import { AdminOverviewSection } from './admin/AdminOverviewSection.tsx';
import { AdminPlayersSection } from './admin/AdminPlayersSection.tsx';
import { AdminScoresSection } from './admin/AdminScoresSection.tsx';

interface AdminDashboardProps {
  onBackToSite: () => void;
}

type AdminTab =
  | 'overview'
  | 'players'
  | 'scores'
  | 'daily'
  | 'weekly'
  | 'overall'
  | 'winners'
  | 'competitions';

const NAV_ITEMS: Array<{
  id: AdminTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'scores', label: 'All Scores', icon: ListOrdered },
  { id: 'daily', label: 'Daily', icon: Calendar },
  { id: 'weekly', label: 'Weekly', icon: BarChart3 },
  { id: 'overall', label: 'Overall Champion', icon: Crown },
  { id: 'winners', label: 'Winners & Rewards', icon: Award },
  { id: 'competitions', label: 'Competitions', icon: Trophy },
];

const PASSCODE_TOKEN_KEY = 'zblal_admin_passcode_token';

function toLocalDatetimeInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function AdminDashboard({ onBackToSite }: AdminDashboardProps) {
  const [authToken, setAuthToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? window.sessionStorage.getItem(PASSCODE_TOKEN_KEY) : null
  );
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [passcodeEnabled, setPasscodeEnabled] = useState(false);

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [passcodeInput, setPasscodeInput] = useState('');

  const [schemaInitialized, setSchemaInitialized] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [inspectPlayerId, setInspectPlayerId] = useState<string | null>(null);

  const [overviewData, setOverviewData] = useState<AdminOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [competitions, setCompetitions] = useState<ArcadeCompetition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [winnerDetails, setWinnerDetails] =
    useState<AdminCompetitionWinnersResponse | null>(null);
  const [historicalWinners, setHistoricalWinners] = useState<
    AdminHistoricalWinnersGroup[]
  >([]);

  const [loadingData, setLoadingData] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  // Create Competition Form State
  const defaultDaily = getAddisAbabaDailyWindow();
  const [compName, setCompName] = useState(defaultDaily.label);
  const [compType, setCompType] = useState<'daily' | 'weekly'>('daily');
  const [startsAtInput, setStartsAtInput] = useState(() =>
    toLocalDatetimeInputValue(defaultDaily.startsAt)
  );
  const [endsAtInput, setEndsAtInput] = useState(() =>
    toLocalDatetimeInputValue(defaultDaily.endsAt)
  );
  const [eligibleGames, setEligibleGames] = useState<ArcadeGameId[]>([
    'poop-man',
    'toilet-basketball',
  ]);
  const [prizeDesc, setPrizeDesc] = useState(
    'Free Zblal service voucher or merch pack (verified by admin)'
  );
  const [compStatus, setCompStatus] = useState<CompetitionStatus>('active');

  // Note drafts per winner row
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    getAdminAuthConfig()
      .then((cfg) => setPasscodeEnabled(Boolean(cfg?.passcodeEnabled)))
      .catch(() => {});
    checkArcadeSchemaStatus()
      .then((st) => setSchemaInitialized(Boolean(st?.initialized)))
      .catch(() => setSchemaInitialized(null));
  }, []);

  // Sync Firebase Auth session + Passcode token verification
  useEffect(() => {
    let active = true;

    const verifyStoredPasscode = async () => {
      const stored =
        typeof window !== 'undefined'
          ? window.sessionStorage.getItem(PASSCODE_TOKEN_KEY)
          : null;
      if (stored) {
        try {
          const res = await checkAdminSession(stored);
          if (!active) return false;
          if (!res?.adminEmail) {
            throw new Error('Invalid admin session response.');
          }
          setAuthToken(stored);
          setAdminEmail(res.adminEmail);
          setAuthChecking(false);
          return true;
        } catch {
          window.sessionStorage.removeItem(PASSCODE_TOKEN_KEY);
        }
      }
      return false;
    };

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      if (user) {
        try {
          const token = await user.getIdToken();
          const res = await checkAdminSession(token);
          if (!active) return;
          if (!res?.adminEmail) {
            throw new Error('Invalid admin session response.');
          }
          setAuthToken(token);
          setAdminEmail(res.adminEmail);
          setAuthError(null);
        } catch (err: unknown) {
          if (!active) return;
          setAuthToken(null);
          setAdminEmail(null);
          setAuthError(
            err instanceof Error ? err.message : 'Not authorized as admin.'
          );
        } finally {
          if (active) setAuthChecking(false);
        }
      } else {
        const hadPasscode = await verifyStoredPasscode();
        if (!hadPasscode && active) {
          setAuthToken(null);
          setAdminEmail(null);
          setAuthChecking(false);
        }
      }
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  const loadOverviewOnly = useCallback(async (token: string) => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const overview = await adminFetchOverview(token);
      setOverviewData(overview);
    } catch (err: unknown) {
      setOverviewError(
        err instanceof Error ? err.message : 'Failed to load arcade overview.'
      );
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadAdminWorkspace = useCallback(
    async (token: string) => {
      setLoadingData(true);
      setOverviewLoading(true);
      setActionErr(null);
      setOverviewError(null);
      try {
        const [compRes, overviewRes, historyRes] = await Promise.all([
          adminListCompetitions(token),
          adminFetchOverview(token),
          adminFetchHistoricalWinners(token),
        ]);

        const safeComps = Array.isArray(compRes?.competitions)
          ? compRes.competitions
          : [];
        setCompetitions(safeComps);
        setOverviewData(overviewRes);
        setHistoricalWinners(
          Array.isArray(historyRes?.history) ? historyRes.history : []
        );

        const targetCompId = selectedCompId || safeComps[0]?.id || '';
        if (targetCompId) {
          setSelectedCompId(targetCompId);
          const wDetails = await adminGetCompetitionWinners(token, targetCompId);
          const safeWinners = Array.isArray(wDetails?.savedWinners)
            ? wDetails.savedWinners
            : [];
          setWinnerDetails(
            wDetails
              ? {
                  ...wDetails,
                  overallStandings: Array.isArray(wDetails.overallStandings)
                    ? wDetails.overallStandings
                    : [],
                  perGameStandings:
                    wDetails.perGameStandings &&
                    typeof wDetails.perGameStandings === 'object'
                      ? wDetails.perGameStandings
                      : {},
                  savedWinners: safeWinners,
                }
              : null
          );
          const nextNotes: Record<string, string> = {};
          for (const w of safeWinners) {
            nextNotes[w.id] = w.adminNote ?? '';
          }
          setNoteDrafts(nextNotes);
        } else {
          setWinnerDetails(null);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Failed to load admin workspace.';
        setActionErr(msg);
        setOverviewError(msg);
      } finally {
        setLoadingData(false);
        setOverviewLoading(false);
      }
    },
    [selectedCompId]
  );

  useEffect(() => {
    if (authToken && adminEmail) {
      void loadAdminWorkspace(authToken);
    }
  }, [authToken, adminEmail, loadAdminWorkspace]);

  const handleSelectCompetitionForReview = async (compId: string) => {
    setSelectedCompId(compId);
    setActiveTab('winners');
    if (!authToken || !compId) return;
    setLoadingData(true);
    setActionErr(null);
    try {
      const [details, historyRes] = await Promise.all([
        adminGetCompetitionWinners(authToken, compId),
        adminFetchHistoricalWinners(authToken),
      ]);
      const safeWinners = Array.isArray(details?.savedWinners)
        ? details.savedWinners
        : [];
      setWinnerDetails(
        details
          ? {
              ...details,
              overallStandings: Array.isArray(details.overallStandings)
                ? details.overallStandings
                : [],
              perGameStandings:
                details.perGameStandings &&
                typeof details.perGameStandings === 'object'
                  ? details.perGameStandings
                  : {},
              savedWinners: safeWinners,
            }
          : null
      );
      setHistoricalWinners(
        Array.isArray(historyRes?.history) ? historyRes.history : []
      );
      const nextNotes: Record<string, string> = {};
      for (const w of safeWinners) {
        nextNotes[w.id] = w.adminNote ?? '';
      }
      setNoteDrafts(nextNotes);
    } catch (err: unknown) {
      setActionErr(
        err instanceof Error ? err.message : 'Failed to load competition standings.'
      );
    } finally {
      setLoadingData(false);
    }
  };

  const handleInspectPlayer = (playerId: string) => {
    setInspectPlayerId(playerId);
    setActiveTab('players');
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in failed.');
    }
  };

  const handleEmailSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Email sign-in failed.');
    }
  };

  const handlePasscodeSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await loginAdminWithPasscode(passcodeInput);
      if (!res?.token || !res?.email) {
        throw new Error('Server returned an incomplete sign-in response.');
      }
      window.sessionStorage.setItem(PASSCODE_TOKEN_KEY, res.token);
      setAuthToken(res.token);
      setAdminEmail(res.email);
      setPasscodeInput('');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Invalid passcode.');
    }
  };

  const handleSignOut = async () => {
    window.sessionStorage.removeItem(PASSCODE_TOKEN_KEY);
    setAuthToken(null);
    setAdminEmail(null);
    try {
      await signOut(auth);
    } catch {
      // Ignore
    }
  };

  const applyPreset = (type: 'daily' | 'weekly') => {
    setCompType(type);
    const win =
      type === 'daily' ? getAddisAbabaDailyWindow() : getAddisAbabaWeeklyWindow();
    setCompName(win.label);
    setStartsAtInput(toLocalDatetimeInputValue(win.startsAt));
    setEndsAtInput(toLocalDatetimeInputValue(win.endsAt));
  };

  const handleCreateCompetition = async (e: FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setActionErr(null);
    setActionMsg(null);
    try {
      const created = await adminCreateCompetition(authToken, {
        name: compName,
        competitionType: compType,
        startsAt: new Date(startsAtInput).toISOString(),
        endsAt: new Date(endsAtInput).toISOString(),
        timezone: COMPETITION_TIMEZONE,
        eligibleGames,
        prizeDescription: prizeDesc,
        status: compStatus,
      });
      if (!created?.competition?.id) {
        throw new Error('Server returned an incomplete competition record.');
      }
      setActionMsg(`Created competition "${created.competition.name}".`);
      setSelectedCompId(created.competition.id);
      await loadAdminWorkspace(authToken);
    } catch (err: unknown) {
      setActionErr(
        err instanceof Error ? err.message : 'Failed to create competition.'
      );
    }
  };

  const handleCompetitionStatusChange = async (
    compId: string,
    status: CompetitionStatus
  ) => {
    if (!authToken) return;
    setActionErr(null);
    try {
      await adminUpdateCompetition(authToken, compId, { status });
      setActionMsg(`Updated competition status to "${status}".`);
      await loadAdminWorkspace(authToken);
    } catch (err: unknown) {
      setActionErr(
        err instanceof Error ? err.message : 'Failed to update competition.'
      );
    }
  };

  const handleSnapshotWinners = async () => {
    if (!authToken || !selectedCompId) return;
    setActionErr(null);
    setActionMsg(null);
    try {
      await adminSnapshotWinners(authToken, selectedCompId);
      setActionMsg(
        'Generated pending winner review candidates. Verify contact details before approving.'
      );
      await Promise.all([
        handleSelectCompetitionForReview(selectedCompId),
        loadOverviewOnly(authToken),
      ]);
    } catch (err: unknown) {
      setActionErr(
        err instanceof Error ? err.message : 'Failed to generate winner review.'
      );
    }
  };

  const handleWinnerAction = async (
    winner: AdminWinnerRecord,
    patch: {
      approvalStatus?: 'pending' | 'approved' | 'rejected';
      prizeStatus?: 'unclaimed' | 'contacted' | 'awarded' | 'forfeited';
      adminNote?: string;
    }
  ) => {
    if (!authToken) return;
    setActionErr(null);
    setActionMsg(null);
    try {
      await adminReviewWinner(authToken, winner.id, {
        ...patch,
        adminNote: patch.adminNote ?? noteDrafts[winner.id] ?? winner.adminNote,
      });
      setActionMsg(`Updated winner review for ${winner.nickname}.`);
      await Promise.all([
        handleSelectCompetitionForReview(winner.competitionId),
        loadOverviewOnly(authToken),
      ]);
    } catch (err: unknown) {
      setActionErr(
        err instanceof Error ? err.message : 'Failed to update winner.'
      );
    }
  };

  const handlePlayerStatus = async (playerId: string, status: PlayerStatus) => {
    if (!authToken) return;
    setActionErr(null);
    try {
      await adminUpdatePlayerStatus(authToken, playerId, status);
      setActionMsg(`Updated player account status to "${status}".`);
      await loadOverviewOnly(authToken);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update player status.';
      setActionErr(msg);
      throw err;
    }
  };

  const handleScoreStatus = async (
    scoreId: string,
    validationStatus: ScoreValidationStatus
  ) => {
    if (!authToken) return;
    setActionErr(null);
    try {
      await adminUpdateScoreValidation(
        authToken,
        scoreId,
        validationStatus,
        `Reviewed by ${adminEmail ?? 'admin'}`
      );
      setActionMsg(`Updated score validation to "${validationStatus}".`);
      await loadOverviewOnly(authToken);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update score validation.';
      setActionErr(msg);
      throw err;
    }
  };

  const nowMs = Date.now();
  const activeCompetitions = competitions.filter((c) => c.status === 'active');
  const upcomingCompetitions = competitions.filter((c) => c.status === 'upcoming');
  const completedOrDisabledCompetitions = competitions.filter(
    (c) =>
      c.status === 'completed' ||
      c.status === 'disabled' ||
      (c.status !== 'upcoming' &&
        c.status !== 'active' &&
        new Date(c.endsAt).getTime() <= nowMs)
  );

  const renderCompetitionCard = (comp: ArcadeCompetition) => (
    <div
      key={comp.id}
      className="rounded-xl border border-[#E5E0D2] bg-[#FAF8F2] p-4 space-y-2.5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-[#143B2B]">
            {comp.name}
          </h3>
          <p className="text-xs text-[#556960] font-mono tabular-nums">
            {comp.competitionType.toUpperCase()} · Status:{' '}
            <strong className="text-[#143B2B] uppercase">{comp.status}</strong> ·{' '}
            {formatCompetitionDateTime(comp.startsAt, comp.timezone)} →{' '}
            {formatCompetitionDateTime(comp.endsAt, comp.timezone)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleSelectCompetitionForReview(comp.id)}
          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#CEF04E] hover:bg-[#D9F66A] text-xs font-bold text-[#143B2B] whitespace-nowrap cursor-pointer"
        >
          Review Winners
        </button>
      </div>

      {comp.prizeDescription && (
        <p className="text-xs text-[#33413B]">Prize: {comp.prizeDescription}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[11px] font-mono text-[#556960]">
          Eligible: {comp.eligibleGames.join(', ')}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {comp.status !== 'active' && (
            <button
              type="button"
              onClick={() => void handleCompetitionStatusChange(comp.id, 'active')}
              className="px-2.5 py-1 rounded-lg border border-[#16A34A]/40 bg-white text-xs font-semibold text-[#166534] cursor-pointer"
            >
              Enable
            </button>
          )}
          {comp.status !== 'completed' && (
            <button
              type="button"
              onClick={() => void handleCompetitionStatusChange(comp.id, 'completed')}
              className="px-2.5 py-1 rounded-lg border border-[#143B2B]/25 bg-white text-xs font-semibold text-[#143B2B] cursor-pointer"
            >
              Mark Completed
            </button>
          )}
          {comp.status !== 'disabled' && (
            <button
              type="button"
              onClick={() => void handleCompetitionStatusChange(comp.id, 'disabled')}
              className="px-2.5 py-1 rounded-lg border border-[#EF4444]/40 bg-white text-xs font-semibold text-[#991B1B] cursor-pointer"
            >
              Disable
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] w-full bg-[#F7F4EC] text-[#1B231F] overflow-x-hidden">
      {/* Compact 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#DED9CA] bg-[#F7F4EC]/95 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#143B2B] text-[#CEF04E]">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="font-display text-base sm:text-xl font-bold text-[#143B2B] truncate">
              POPO Arcade Admin
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {adminEmail && (
              <span className="hidden md:inline text-xs font-mono text-[#556960] mr-1">
                {adminEmail}
              </span>
            )}
            {adminEmail && (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[#143B2B]/20 bg-white hover:bg-[#143B2B] hover:text-white text-xs font-semibold text-[#143B2B] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
            <button
              type="button"
              onClick={onBackToSite}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#143B2B] hover:bg-[#1D523B] text-xs sm:text-sm font-semibold text-[#F7F4EC] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Site</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {schemaInitialized === false && (
          <div className="rounded-xl border border-[#D97706]/50 bg-[#FEF3C7] p-4 text-xs sm:text-sm text-[#78350F] flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#D97706]" />
            <div>
              <p className="font-bold">
                Supabase Arcade Tables Not Initialized Yet
              </p>
              <p className="mt-1">
                Run{' '}
                <code className="font-mono font-semibold">
                  supabase/migrations/20261116_popo_arcade.sql
                </code>{' '}
                and{' '}
                <code className="font-mono font-semibold">
                  supabase/migrations/20261117_arcade_admin_indexes.sql
                </code>{' '}
                in your Supabase SQL Editor to provision{' '}
                <code className="font-mono">arcade_players</code>,{' '}
                <code className="font-mono">arcade_competitions</code>,{' '}
                <code className="font-mono">arcade_scores</code>,{' '}
                <code className="font-mono">arcade_winners</code>, and{' '}
                <code className="font-mono">arcade_winner_audit_logs</code>.
              </p>
            </div>
          </div>
        )}

        {authChecking ? (
          <div className="rounded-xl border border-[#DED9CA] bg-white p-8 text-center text-sm text-[#556960]">
            Checking admin authorization...
          </div>
        ) : !authToken || !adminEmail ? (
          <div className="max-w-md mx-auto rounded-2xl border border-[#DED9CA] bg-white p-6 space-y-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#143B2B] text-[#CEF04E]">
                <Lock className="w-5 h-5" />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold text-[#143B2B]">
                  Admin Sign-In Required
                </h2>
                <p className="text-xs text-[#556960]">
                  Only authorized admins can view player phone numbers and approve
                  competition winners.
                </p>
              </div>
            </div>

            {authError && (
              <div
                role="alert"
                className="rounded-xl border border-[#EF4444]/40 bg-[#FEE2E2] px-3.5 py-2.5 text-xs text-[#991B1B]"
              >
                {authError}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#143B2B] hover:bg-[#1D523B] text-sm font-bold text-[#F7F4EC] cursor-pointer"
            >
              Sign in with Authorized Google Account
            </button>

            <form
              onSubmit={handleEmailSignIn}
              className="space-y-3 pt-3 border-t border-[#ECE8DC]"
            >
              <p className="text-xs font-semibold text-[#556960]">
                Or sign in with Admin Email & Password
              </p>
              <input
                type="email"
                required
                placeholder="Admin email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#D4CFC0] px-3 py-2 text-sm"
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#D4CFC0] px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl border border-[#143B2B] bg-white hover:bg-[#F7F4EC] text-sm font-bold text-[#143B2B] cursor-pointer"
              >
                Sign In with Email
              </button>
            </form>

            {passcodeEnabled && (
              <form
                onSubmit={handlePasscodeSignIn}
                className="space-y-3 pt-3 border-t border-[#ECE8DC]"
              >
                <p className="text-xs font-semibold text-[#556960]">
                  Admin Passcode Access
                </p>
                <input
                  type="password"
                  required
                  placeholder="Enter ADMIN_PASSCODE"
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D4CFC0] px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="w-full min-h-[44px] rounded-xl bg-[#CEF04E] text-[#143B2B] text-sm font-bold cursor-pointer"
                >
                  Unlock with Passcode
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Mobile Compact Section Strip */}
            <nav
              aria-label="Arcade admin sections"
              className="lg:hidden w-full flex items-center gap-1.5 overflow-x-auto pb-1"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id !== 'players') setInspectPlayerId(null);
                      setActiveTab(item.id);
                    }}
                    className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#143B2B] text-[#CEF04E]'
                        : 'bg-white border border-[#DED9CA] text-[#143B2B]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Desktop Sidebar (240px) */}
            <aside className="hidden lg:flex lg:flex-col lg:w-60 shrink-0 rounded-xl border border-[#DED9CA] bg-white p-3 space-y-1 sticky top-20">
              <div className="px-2.5 py-2 text-[11px] font-mono uppercase tracking-wider text-[#556960]">
                Arcade Management
              </div>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id !== 'players') setInspectPlayerId(null);
                      setActiveTab(item.id);
                    }}
                    className={`w-full min-h-[40px] px-3 py-2 rounded-lg text-sm font-semibold inline-flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#143B2B] text-[#CEF04E]'
                        : 'text-[#143B2B] hover:bg-[#FAF8F2]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.id === 'winners' &&
                      (overviewData?.pendingWinnerApprovals ?? 0) > 0 && (
                        <span className="font-mono text-xs font-bold tabular-nums">
                          {overviewData?.pendingWinnerApprovals}
                        </span>
                      )}
                  </button>
                );
              })}

              <div className="pt-3 mt-2 border-t border-[#ECE8DC] px-2 space-y-2">
                <p className="text-[11px] text-[#556960] leading-relaxed">
                  Private phone numbers are restricted to authorized POPO admins and
                  never exposed on public leaderboards.
                </p>
                <button
                  type="button"
                  onClick={() => void loadAdminWorkspace(authToken)}
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#DED9CA] bg-[#FAF8F2] hover:bg-[#ECE8DC] text-xs font-semibold text-[#143B2B] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`}
                  />
                  <span>Sync Workspace</span>
                </button>
              </div>
            </aside>

            {/* Primary Content Column */}
            <div className="flex-1 min-w-0 w-full space-y-5">
              {actionMsg && (
                <div className="rounded-xl border border-[#16A34A]/40 bg-[#DCFCE7] px-4 py-2.5 text-xs sm:text-sm text-[#166534]">
                  {actionMsg}
                </div>
              )}
              {actionErr && (
                <div className="rounded-xl border border-[#EF4444]/40 bg-[#FEE2E2] px-4 py-2.5 text-xs sm:text-sm text-[#991B1B]">
                  {actionErr}
                </div>
              )}

              {/* 1. OVERVIEW */}
              {activeTab === 'overview' && (
                <AdminOverviewSection
                  overview={overviewData}
                  loading={overviewLoading}
                  error={overviewError}
                  onRefresh={() => void loadOverviewOnly(authToken)}
                  onNavigateTab={(tab) => {
                    if (tab !== 'players') setInspectPlayerId(null);
                    setActiveTab(tab);
                  }}
                />
              )}

              {/* 2. PLAYERS & PLAYER DETAILS */}
              {activeTab === 'players' && (
                <AdminPlayersSection
                  authToken={authToken}
                  initialSelectedPlayerId={inspectPlayerId}
                  onClearInitialPlayer={() => setInspectPlayerId(null)}
                  onUpdatePlayerStatus={handlePlayerStatus}
                  onUpdateScoreValidation={handleScoreStatus}
                />
              )}

              {/* 3. ALL SCORES */}
              {activeTab === 'scores' && (
                <AdminScoresSection
                  authToken={authToken}
                  onInspectPlayer={handleInspectPlayer}
                  onUpdateScoreValidation={handleScoreStatus}
                />
              )}

              {/* 4, 5, 6. DAILY / WEEKLY / OVERALL LEADERBOARDS */}
              {(activeTab === 'daily' ||
                activeTab === 'weekly' ||
                activeTab === 'overall') && (
                <AdminLeaderboardsSection
                  authToken={authToken}
                  mode={activeTab}
                  competitions={competitions}
                  onInspectPlayer={handleInspectPlayer}
                />
              )}

              {/* 7. WINNERS & REWARDS */}
              {activeTab === 'winners' && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-[#DED9CA] bg-white p-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-semibold text-[#556960] mb-1">
                        Select Competition to Review Winners & Fulfill Rewards
                      </label>
                      <select
                        value={selectedCompId}
                        onChange={(e) =>
                          void handleSelectCompetitionForReview(e.target.value)
                        }
                        className="w-full max-w-md min-h-[42px] rounded-xl border border-[#D4CFC0] px-3 py-2 text-sm bg-white"
                      >
                        {competitions.length === 0 && (
                          <option value="">No competitions available</option>
                        )}
                        {competitions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.competitionType} · {c.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedCompId && (
                      <button
                        type="button"
                        onClick={() => void handleSnapshotWinners()}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-[#143B2B] hover:bg-[#1D523B] text-xs sm:text-sm font-bold text-[#CEF04E] whitespace-nowrap cursor-pointer"
                      >
                        Generate Pending Winner Review
                      </button>
                    )}
                  </div>

                  {winnerDetails && winnerDetails.competition && (
                    <>
                      {/* Manual Winner Approvals + Private Contact Numbers */}
                      <div className="rounded-xl border border-[#DED9CA] bg-white p-5 space-y-4">
                        <div>
                          <h2 className="font-display text-lg font-bold text-[#143B2B]">
                            Winner Approval & Prize Fulfillment
                          </h2>
                          <p className="text-xs text-[#556960] mt-0.5">
                            Prize:{' '}
                            <strong className="text-[#143B2B]">
                              {winnerDetails.competition.prizeDescription ||
                                'Standard reward'}
                            </strong>{' '}
                            · Phone numbers are{' '}
                            <strong className="text-[#143B2B]">unverified</strong>{' '}
                            (no OTP). Contact the player before approving or marking
                            prize awarded.
                          </p>
                        </div>

                        {winnerDetails.savedWinners.length === 0 ? (
                          <p className="text-sm text-[#556960] py-4">
                            No winner review records generated for this competition yet.
                            Click <strong>Generate Pending Winner Review</strong> once
                            valid scores exist.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {winnerDetails.savedWinners.map((w) => (
                              <div
                                key={w.id}
                                className="rounded-xl border border-[#E5E0D2] bg-[#FAF8F2] p-4 space-y-3"
                              >
                                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                                  <div>
                                    <div className="text-xs font-mono font-bold text-[#143B2B]">
                                      {w.winnerType === 'overall'
                                        ? 'OVERALL CHAMPION'
                                        : `${w.gameName ?? 'GAME'} WINNER`}{' '}
                                      · Rank #{w.rank}
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleInspectPlayer(w.playerId)}
                                        className="font-display text-lg font-bold text-[#1B231F] hover:underline cursor-pointer"
                                      >
                                        {w.nickname}
                                      </button>
                                      <span className="font-mono text-sm font-semibold text-[#143B2B] tabular-nums">
                                        {w.phoneNumber}
                                      </span>
                                      <span className="text-[11px] text-[#556960]">
                                        (unverified · admin only)
                                      </span>
                                    </div>
                                    <div className="text-xs text-[#556960] font-mono tabular-nums mt-0.5">
                                      Score: <strong>{w.finalScore.toLocaleString()}</strong>{' '}
                                      · Points: <strong>{w.competitionPoints}</strong> ·
                                      Approval:{' '}
                                      <strong className="uppercase">
                                        {w.approvalStatus}
                                      </strong>{' '}
                                      · Prize:{' '}
                                      <strong className="uppercase">
                                        {w.prizeStatus}
                                      </strong>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleWinnerAction(w, {
                                          approvalStatus: 'approved',
                                        })
                                      }
                                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-xs font-bold text-white inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleWinnerAction(w, {
                                          approvalStatus: 'rejected',
                                        })
                                      }
                                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-xs font-bold text-white inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>Reject</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleWinnerAction(w, {
                                          prizeStatus: 'contacted',
                                        })
                                      }
                                      className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#143B2B]/25 bg-white hover:bg-[#ECE8DC] text-xs font-semibold text-[#143B2B] cursor-pointer"
                                    >
                                      Mark Contacted
                                    </button>
                                    <button
                                      type="button"
                                      disabled={w.approvalStatus !== 'approved'}
                                      onClick={() =>
                                        void handleWinnerAction(w, {
                                          prizeStatus: 'awarded',
                                        })
                                      }
                                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#143B2B] hover:bg-[#1D523B] disabled:opacity-40 text-xs font-bold text-[#CEF04E] cursor-pointer"
                                    >
                                      Mark Prize Awarded
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleWinnerAction(w, {
                                          prizeStatus: 'forfeited',
                                        })
                                      }
                                      className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#EF4444]/40 bg-white hover:bg-[#FEE2E2] text-xs font-semibold text-[#991B1B] cursor-pointer"
                                    >
                                      Forfeit
                                    </button>
                                  </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    type="text"
                                    placeholder="Internal admin verification note (e.g., Called winner & confirmed identity)"
                                    value={noteDrafts[w.id] ?? ''}
                                    onChange={(e) =>
                                      setNoteDrafts((prev) => ({
                                        ...prev,
                                        [w.id]: e.target.value,
                                      }))
                                    }
                                    className="flex-1 min-h-[40px] rounded-lg border border-[#D4CFC0] bg-white px-3 py-1.5 text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleWinnerAction(w, {
                                        adminNote: noteDrafts[w.id] ?? '',
                                      })
                                    }
                                    className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-[#143B2B]/25 bg-white hover:bg-[#ECE8DC] text-xs font-semibold text-[#143B2B] cursor-pointer"
                                  >
                                    Save Note
                                  </button>
                                </div>

                                {w.auditLogs && w.auditLogs.length > 0 && (
                                  <div className="pt-2 border-t border-[#E5E0D2] space-y-1">
                                    <p className="text-[11px] font-mono font-semibold text-[#556960]">
                                      Audit History
                                    </p>
                                    {w.auditLogs.map((log) => (
                                      <div
                                        key={log.id}
                                        className="text-[11px] text-[#556960] flex flex-wrap gap-x-2"
                                      >
                                        <span className="font-mono">
                                          {formatCompetitionDateTime(log.createdAt)}
                                        </span>
                                        <span className="font-semibold text-[#143B2B]">
                                          {log.action}
                                        </span>
                                        <span>by {log.actorEmail}</span>
                                        {log.adminNote && <span>— "{log.adminNote}"</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Candidate Standings With Private Phone Contacts */}
                      <div className="rounded-xl border border-[#DED9CA] bg-white p-5 space-y-4">
                        <h3 className="font-display text-base font-bold text-[#143B2B]">
                          Competition Candidate Standings (With Private Phone Contacts)
                        </h3>

                        {winnerDetails.overallStandings.length === 0 ? (
                          <p className="text-xs sm:text-sm text-[#556960]">
                            No valid scores recorded inside this competition window yet.
                          </p>
                        ) : (
                          <>
                            {/* Mobile cards */}
                            <div className="md:hidden space-y-2.5">
                              {winnerDetails.overallStandings.map((row) => (
                                <div
                                  key={row.playerId}
                                  className="rounded-lg border border-[#E5E0D2] bg-[#FAF8F2] p-3 text-xs space-y-1"
                                >
                                  <div className="flex items-baseline justify-between">
                                    <button
                                      type="button"
                                      onClick={() => handleInspectPlayer(row.playerId)}
                                      className="font-bold text-[#143B2B] hover:underline"
                                    >
                                      #{row.rank} {row.nickname}
                                    </button>
                                    <span className="font-mono font-bold text-[#143B2B] tabular-nums">
                                      {row.totalPoints} pts
                                    </span>
                                  </div>
                                  <div className="font-mono text-[#1B231F] tabular-nums">
                                    {row.phoneNumber} (unverified)
                                  </div>
                                  <div className="text-[#556960]">
                                    {row.breakdown
                                      .map(
                                        (b) =>
                                          `${b.gameName}: #${b.rank} (${b.bestScore} · ${b.points}pts)`
                                      )
                                      .join(' · ')}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Desktop table */}
                            <div className="hidden md:block overflow-x-auto">
                              <table className="w-full text-left text-xs sm:text-sm tabular-nums">
                                <thead>
                                  <tr className="border-b border-[#E5E0D2] text-[11px] font-mono text-[#556960]">
                                    <th className="py-2 px-3">Rank</th>
                                    <th className="py-2 px-3">Nickname</th>
                                    <th className="py-2 px-3">Private Phone</th>
                                    <th className="py-2 px-3">Game Breakdown</th>
                                    <th className="py-2 px-3 text-right">Points</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F0EDE2]">
                                  {winnerDetails.overallStandings.map((row) => (
                                    <tr key={row.playerId}>
                                      <td className="py-2.5 px-3 font-mono font-bold">
                                        #{row.rank}
                                      </td>
                                      <td className="py-2.5 px-3 font-semibold">
                                        <button
                                          type="button"
                                          onClick={() => handleInspectPlayer(row.playerId)}
                                          className="text-[#143B2B] hover:underline cursor-pointer"
                                        >
                                          {row.nickname}
                                        </button>
                                      </td>
                                      <td className="py-2.5 px-3 font-mono">
                                        {row.phoneNumber}{' '}
                                        <span className="font-sans text-[10px] text-[#556960]">
                                          (unverified)
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-xs text-[#556960]">
                                        {row.breakdown
                                          .map(
                                            (b) =>
                                              `${b.gameName}: #${b.rank} (${b.bestScore} · ${b.points}pts)`
                                          )
                                          .join(' · ')}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#143B2B]">
                                        {row.totalPoints} pts
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}

                        {/* Per-game top finishers */}
                        {Object.entries(winnerDetails.perGameStandings).length > 0 && (
                          <div className="pt-3 border-t border-[#ECE8DC] grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(winnerDetails.perGameStandings).map(
                              ([gId, entries]) => (
                                <div
                                  key={gId}
                                  className="rounded-lg border border-[#E5E0D2] bg-[#FAF8F2] p-3.5 space-y-2"
                                >
                                  <p className="font-display text-sm font-bold text-[#143B2B]">
                                    {ARCADE_GAMES.find((g) => g.id === gId)?.name ?? gId}{' '}
                                    Top Finishers
                                  </p>
                                  {entries.length === 0 ? (
                                    <p className="text-xs text-[#556960]">
                                      No valid runs in window.
                                    </p>
                                  ) : (
                                    <div className="space-y-1.5 text-xs tabular-nums">
                                      {entries.slice(0, 5).map((entry) => (
                                        <div
                                          key={entry.playerId}
                                          className="flex items-center justify-between gap-2"
                                        >
                                          <div className="min-w-0 truncate">
                                            <span className="font-mono font-bold text-[#143B2B]">
                                              #{entry.rank}
                                            </span>{' '}
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleInspectPlayer(entry.playerId)
                                              }
                                              className="font-semibold hover:underline cursor-pointer"
                                            >
                                              {entry.nickname}
                                            </button>{' '}
                                            <span className="font-mono text-[11px] text-[#556960]">
                                              ({entry.phoneNumber})
                                            </span>
                                          </div>
                                          <span className="font-mono font-bold text-[#143B2B] shrink-0">
                                            {entry.bestScore.toLocaleString()}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Historical Winners Across All Competitions */}
                  <div className="rounded-xl border border-[#DED9CA] bg-white p-5 space-y-3">
                    <div>
                      <h3 className="font-display text-base font-bold text-[#143B2B]">
                        Historical Winners Across Competitions ({historicalWinners.length})
                      </h3>
                      <p className="text-xs text-[#556960]">
                        Complete audit trail of past and pending competition winners and
                        prize fulfillment status.
                      </p>
                    </div>

                    {historicalWinners.length === 0 ? (
                      <p className="text-xs sm:text-sm text-[#556960] py-4">
                        No historical winner records saved yet. Generate a pending
                        winner review on any competition above to archive results.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {historicalWinners.map((group) => (
                          <div
                            key={group.competition.id}
                            className="rounded-xl border border-[#E5E0D2] bg-[#FAF8F2] p-4 space-y-2.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-display text-sm font-bold text-[#143B2B]">
                                  {group.competition.name}
                                </p>
                                <p className="text-[11px] font-mono text-[#556960] tabular-nums">
                                  {group.competition.competitionType.toUpperCase()} ·{' '}
                                  {formatCompetitionDateTime(group.competition.startsAt)}{' '}
                                  → {formatCompetitionDateTime(group.competition.endsAt)}{' '}
                                  · Prize:{' '}
                                  {group.competition.prizeDescription || 'Standard reward'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleSelectCompetitionForReview(
                                    group.competition.id
                                  )
                                }
                                className="px-3 py-1 rounded-lg border border-[#D4CFC0] bg-white hover:bg-[#ECE8DC] text-xs font-semibold text-[#143B2B] cursor-pointer"
                              >
                                Open Review
                              </button>
                            </div>

                            <div className="divide-y divide-[#E5E0D2]">
                              {group.winners.map((w) => (
                                <div
                                  key={w.id}
                                  className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums"
                                >
                                  <div>
                                    <span className="font-mono font-bold text-[#143B2B]">
                                      {w.winnerType === 'overall'
                                        ? 'Overall'
                                        : w.gameName ?? 'Game'}{' '}
                                      #{w.rank}
                                    </span>{' '}
                                    ·{' '}
                                    <button
                                      type="button"
                                      onClick={() => handleInspectPlayer(w.playerId)}
                                      className="font-semibold text-[#143B2B] hover:underline cursor-pointer"
                                    >
                                      {w.nickname}
                                    </button>{' '}
                                    ·{' '}
                                    <span className="font-mono text-[#556960]">
                                      {w.phoneNumber}
                                    </span>
                                  </div>
                                  <div className="font-mono text-[#556960]">
                                    Score {w.finalScore.toLocaleString()} ·{' '}
                                    {w.competitionPoints} pts · Approval:{' '}
                                    <strong className="text-[#143B2B] uppercase">
                                      {w.approvalStatus}
                                    </strong>{' '}
                                    · Prize:{' '}
                                    <strong className="text-[#143B2B] uppercase">
                                      {w.prizeStatus}
                                    </strong>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 8. COMPETITION MANAGEMENT */}
              {activeTab === 'competitions' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* Create Competition Form */}
                  <form
                    onSubmit={handleCreateCompetition}
                    className="xl:col-span-5 rounded-xl border border-[#DED9CA] bg-white p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-display text-lg font-bold text-[#143B2B]">
                        Create Competition
                      </h2>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyPreset('daily')}
                          className="px-2.5 py-1 rounded-lg bg-[#F7F4EC] hover:bg-[#ECE8DC] text-xs font-semibold text-[#143B2B] cursor-pointer"
                        >
                          Today Daily
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('weekly')}
                          className="px-2.5 py-1 rounded-lg bg-[#F7F4EC] hover:bg-[#ECE8DC] text-xs font-semibold text-[#143B2B] cursor-pointer"
                        >
                          This Week
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#556960] mb-1">
                        Competition Name
                      </label>
                      <input
                        type="text"
                        required
                        value={compName}
                        onChange={(e) => setCompName(e.target.value)}
                        className="w-full min-h-[42px] rounded-xl border border-[#D4CFC0] px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#556960] mb-1">
                          Type
                        </label>
                        <select
                          value={compType}
                          onChange={(e) =>
                            setCompType(e.target.value as 'daily' | 'weekly')
                          }
                          className="w-full min-h-[42px] rounded-xl border border-[#D4CFC0] px-3 py-2 text-sm bg-white"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#556960] mb-1">
                          Initial Status
                        </label>
                        <select
                          value={compStatus}
                          onChange={(e) =>
                            setCompStatus(e.target.value as CompetitionStatus)
                          }
                          className="w-full min-h-[42px] rounded-xl border border-[#D4CFC0] px-3 py-2 text-sm bg-white"
                        >
                          <option value="active">Active</option>
                          <option value="upcoming">Upcoming</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#556960] mb-1">
                          Starts At ({COMPETITION_TIMEZONE})
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={startsAtInput}
                          onChange={(e) => setStartsAtInput(e.target.value)}
                          className="w-full min-h-[42px] rounded-xl border border-[#D4CFC0] px-3 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#556960] mb-1">
                          Ends At ({COMPETITION_TIMEZONE})
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={endsAtInput}
                          onChange={(e) => setEndsAtInput(e.target.value)}
                          className="w-full min-h-[42px] rounded-xl border border-[#D4CFC0] px-3 py-2 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#556960] mb-1.5">
                        Eligible Games
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {ARCADE_GAMES.filter((g) => g.playable).map((g) => {
                          const checked = eligibleGames.includes(g.id);
                          return (
                            <label
                              key={g.id}
                              className="inline-flex items-center gap-2 rounded-xl border border-[#D4CFC0] px-3 py-2 text-xs font-semibold cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEligibleGames((prev) => [...prev, g.id]);
                                  } else {
                                    setEligibleGames((prev) =>
                                      prev.filter((id) => id !== g.id)
                                    );
                                  }
                                }}
                              />
                              <span>{g.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#556960] mb-1">
                        Prize Description (Disclosed to Players)
                      </label>
                      <textarea
                        rows={2}
                        value={prizeDesc}
                        onChange={(e) => setPrizeDesc(e.target.value)}
                        className="w-full rounded-xl border border-[#D4CFC0] px-3 py-2 text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#143B2B] hover:bg-[#1D523B] text-sm font-bold text-[#CEF04E] inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Save Competition</span>
                    </button>
                  </form>

                  {/* Grouped Active / Upcoming / Completed Competitions */}
                  <div className="xl:col-span-7 space-y-5">
                    <div className="rounded-xl border border-[#DED9CA] bg-white p-5 space-y-3">
                      <h2 className="font-display text-base font-bold text-[#143B2B]">
                        Active Competitions ({activeCompetitions.length})
                      </h2>
                      {activeCompetitions.length === 0 ? (
                        <p className="text-xs sm:text-sm text-[#556960]">
                          No manually activated competitions right now. Default{' '}
                          {COMPETITION_TIMEZONE} daily & weekly windows still track
                          automatically.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {activeCompetitions.map(renderCompetitionCard)}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-[#DED9CA] bg-white p-5 space-y-3">
                      <h2 className="font-display text-base font-bold text-[#143B2B]">
                        Upcoming Competitions ({upcomingCompetitions.length})
                      </h2>
                      {upcomingCompetitions.length === 0 ? (
                        <p className="text-xs sm:text-sm text-[#556960]">
                          No upcoming competitions scheduled yet.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {upcomingCompetitions.map(renderCompetitionCard)}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-[#DED9CA] bg-white p-5 space-y-3">
                      <h2 className="font-display text-base font-bold text-[#143B2B]">
                        Completed & Disabled ({completedOrDisabledCompetitions.length})
                      </h2>
                      {completedOrDisabledCompetitions.length === 0 ? (
                        <p className="text-xs sm:text-sm text-[#556960]">
                          No completed competitions yet.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {completedOrDisabledCompetitions.map(renderCompetitionCard)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
