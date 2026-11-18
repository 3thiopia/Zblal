import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  Clock,
  Gamepad2,
  Lock,
  LogOut,
  Play,
  Trophy,
  User,
  UserCheck,
} from 'lucide-react';
import {
  ARCADE_GAMES,
  COMPETITION_TIMEZONE,
  formatCountdownRemaining,
  type ArcadeGameId,
  type PlayableArcadeGameId,
  type PublicArcadePlayer,
} from '../arcade/arcadeConfig.ts';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import {
  clearArcadePlayerSession,
  fetchCompetitionsOverview,
  loadSavedArcadePlayer,
  refreshArcadePlayer,
  saveArcadePlayerSession,
  type CompetitionsOverviewResponse,
  type StoredPlayerSession,
} from '../services/arcadeClient.ts';
import { triggerHaptic } from '../utils/haptics.ts';
import { ArcadeLeaderboardView } from './ArcadeLeaderboardView.tsx';
import { ArcadePlayerRegistration } from './ArcadePlayerRegistration.tsx';
import { LanguageSelector } from './LanguageSelector.tsx';
import { loadDontDropHighScore } from './DontDropThePoopGame.tsx';
import { loadPoopDropHighScore } from './PoopDropGame.tsx';
import { loadPoopRunHighScore } from './PoopRunGame.tsx';
import { loadToiletBasketballHighScore } from './ToiletBasketballGame.tsx';

interface GameSelectorModalProps {
  initialTab?: 'games' | 'leaderboards';
  initialLeaderboardGame?: string;
  onSelectGame: (gameId: PlayableArcadeGameId) => void;
  onPlayerReady?: (player: PublicArcadePlayer | StoredPlayerSession | null) => void;
  onClose: () => void;
}

type HubTab = 'games' | 'leaderboards' | 'profile';

function loadLocalBestScore(gameId: ArcadeGameId): number {
  if (typeof window === 'undefined') return 0;
  try {
    if (gameId === 'poop-man') {
      const raw = window.localStorage.getItem('popo_man_high_score');
      const parsed = raw ? Number.parseInt(raw, 10) : 0;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
    if (gameId === 'toilet-basketball') {
      return loadToiletBasketballHighScore();
    }
    if (gameId === 'poop-drop') {
      return loadPoopDropHighScore();
    }
    if (gameId === 'poop-run') {
      return loadPoopRunHighScore();
    }
    if (gameId === 'dont-drop-the-poop') {
      return loadDontDropHighScore();
    }
    return 0;
  } catch {
    return 0;
  }
}

function GameCardArtwork({ gameId }: { gameId: ArcadeGameId }) {
  if (gameId === 'poop-man') {
    return (
      <svg viewBox="0 0 320 180" aria-hidden="true" className="w-full h-full">
        <rect width="320" height="180" fill="#0B2017" />
        <rect
          x="18"
          y="16"
          width="284"
          height="148"
          rx="14"
          fill="none"
          stroke="#245C44"
          strokeWidth="6"
        />
        <path
          d="M68 50 H148 M188 50 H254 M68 130 H140 M188 130 H254"
          stroke="#2D7A58"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <circle cx="88" cy="90" r="6" fill="#F7F4EC" />
        <circle cx="118" cy="90" r="6" fill="#F7F4EC" />
        <circle cx="206" cy="90" r="9.5" fill="#FACC15" />
        <g transform="translate(158, 90)">
          <circle cx="0" cy="0" r="22" fill="#8C542B" stroke="#2B1609" strokeWidth="3" />
          <path d="M-8,-20 Q0,-32 10,-20" fill="#9D6134" stroke="#2B1609" strokeWidth="2.5" />
          <circle cx="-6.5" cy="-4" r="4" fill="#FFFDF8" />
          <circle cx="6.5" cy="-4" r="4" fill="#FFFDF8" />
          <circle cx="-5" cy="-4" r="1.8" fill="#1B1109" />
          <circle cx="8" cy="-4" r="1.8" fill="#1B1109" />
          <path d="M-5.5,6 Q0,11 5.5,6" fill="none" stroke="#1B1109" strokeWidth="2.3" strokeLinecap="round" />
        </g>
        <g transform="translate(254, 90)">
          <circle cx="0" cy="0" r="15" fill="#22C55E" stroke="#052E16" strokeWidth="2.5" />
          <circle cx="-4.5" cy="-3" r="2.8" fill="#FFFDF8" />
          <circle cx="4.5" cy="-3" r="2.8" fill="#FFFDF8" />
          <circle cx="-4.5" cy="-3" r="1.3" fill="#052E16" />
          <circle cx="4.5" cy="-3" r="1.3" fill="#052E16" />
        </g>
      </svg>
    );
  }

  if (gameId === 'toilet-basketball') {
    return (
      <svg viewBox="0 0 320 180" aria-hidden="true" className="w-full h-full">
        <rect width="320" height="180" fill="#0E2A1E" />
        <rect x="0" y="148" width="320" height="32" fill="#184632" />
        <path
          d="M66 116 Q142 26 226 76"
          fill="none"
          stroke="#CEF04E"
          strokeOpacity="0.6"
          strokeWidth="2.5"
          strokeDasharray="6 6"
        />
        <g transform="translate(66, 118)">
          <circle cx="0" cy="0" r="18" fill="#8C542B" stroke="#2B1609" strokeWidth="2.5" />
          <path d="M-7,-13 Q0,-24 6,-13" fill="#9D6134" stroke="#2B1609" strokeWidth="2" />
          <line x1="-16" y1="0" x2="16" y2="0" stroke="#4B2811" strokeWidth="1.5" />
          <circle cx="-5" cy="-2" r="3.2" fill="#FFFDF8" />
          <circle cx="5" cy="-2" r="3.2" fill="#FFFDF8" />
          <circle cx="-4.2" cy="-2" r="1.5" fill="#1B1109" />
          <circle cx="5.8" cy="-2" r="1.5" fill="#1B1109" />
          <path d="M-4,6 Q0,10 4,6" fill="none" stroke="#1B1109" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g transform="translate(234, 86)">
          <rect x="30" y="-12" width="10" height="78" rx="3" fill="#6B8E7E" stroke="#102C20" strokeWidth="2" />
          <rect x="18" y="-44" width="24" height="58" rx="6" fill="#F7F4EC" stroke="#102C20" strokeWidth="2.2" />
          <rect x="22" y="-26" width="12" height="18" fill="none" stroke="#143B2B" strokeWidth="1.8" />
          <path d="M-24 2 Q-18 38 0 40 Q18 38 24 2 Z" fill="#F7F4EC" stroke="#102C20" strokeWidth="2.2" />
          <ellipse cx="0" cy="20" rx="15" ry="5" fill="#38BDF8" />
          <ellipse cx="0" cy="0" rx="26" ry="7" fill="none" stroke="#CEF04E" strokeWidth="3.5" />
        </g>
      </svg>
    );
  }

  if (gameId === 'poop-drop') {
    return (
      <svg viewBox="0 0 320 180" aria-hidden="true" className="w-full h-full">
        <rect width="320" height="180" fill="#102E22" />
        <line x1="48" y1="40" x2="272" y2="40" stroke="#CEF04E" strokeOpacity="0.4" strokeWidth="2.5" strokeDasharray="6 6" />
        <g transform="translate(160, 42)">
          <ellipse cx="0" cy="9" rx="20" ry="9" fill="#7A4824" stroke="#2B1609" strokeWidth="2" />
          <ellipse cx="0" cy="1" rx="14" ry="8" fill="#8C542B" stroke="#2B1609" strokeWidth="2" />
          <circle cx="-5" cy="2" r="2.8" fill="#FFFDF8" />
          <circle cx="5" cy="2" r="2.8" fill="#FFFDF8" />
        </g>
        <g transform="translate(160, 134)">
          <rect x="-24" y="-18" width="48" height="22" rx="5" fill="#E5DFD2" stroke="#102C20" strokeWidth="2" />
          <ellipse cx="0" cy="12" rx="30" ry="15" fill="#F7F4EC" stroke="#102C20" strokeWidth="2" />
          <ellipse cx="0" cy="6" rx="20" ry="6" fill="#38BDF8" />
        </g>
      </svg>
    );
  }

  if (gameId === 'poop-run') {
    return (
      <svg viewBox="0 0 320 180" aria-hidden="true" className="w-full h-full">
        <rect width="320" height="180" fill="#0D261C" />
        <rect x="0" y="138" width="320" height="42" fill="#174430" />
        <g transform="translate(96, 112)">
          <ellipse cx="0" cy="10" rx="18" ry="9" fill="#8C542B" stroke="#2B1609" strokeWidth="2" />
          <ellipse cx="0" cy="0" rx="12" ry="8" fill="#9D6134" stroke="#2B1609" strokeWidth="2" />
          <circle cx="3" cy="-1" r="2.8" fill="#FFFDF8" />
          <circle cx="4" cy="-1" r="1.4" fill="#1B1109" />
        </g>
        <rect x="206" y="102" width="12" height="36" rx="4" fill="#A16207" stroke="#2B1609" strokeWidth="2" />
        <path d="M196 138 Q212 122 228 138 Z" fill="#EF4444" stroke="#2B1609" strokeWidth="2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 320 180" aria-hidden="true" className="w-full h-full">
      <rect width="320" height="180" fill="#0F2C20" />
      <rect x="148" y="96" width="24" height="58" rx="6" fill="#D97706" stroke="#2B1609" strokeWidth="2" />
      <path d="M126 98 Q160 72 194 98 Z" fill="#EF4444" stroke="#2B1609" strokeWidth="2" />
      <g transform="translate(160, 62) rotate(-8)">
        <ellipse cx="0" cy="8" rx="20" ry="10" fill="#8C542B" stroke="#2B1609" strokeWidth="2.2" />
        <ellipse cx="0" cy="-2" rx="14" ry="8" fill="#9D6134" stroke="#2B1609" strokeWidth="2.2" />
        <circle cx="-5" cy="-1" r="3" fill="#FFFDF8" />
        <circle cx="5" cy="-1" r="3" fill="#FFFDF8" />
      </g>
    </svg>
  );
}

export function GameSelectorModal({
  initialTab = 'games',
  initialLeaderboardGame = 'overall',
  onSelectGame,
  onPlayerReady,
  onClose,
}: GameSelectorModalProps) {
  const { t } = useLanguage();
  const hub = t.arcade.hub;
  const prefersReducedMotion = useReducedMotion() ?? false;

  const [savedSession, setSavedSession] = useState<StoredPlayerSession | null>(() =>
    loadSavedArcadePlayer()
  );
  const [playerProfile, setPlayerProfile] = useState<PublicArcadePlayer | null>(null);
  const [activeTab, setActiveTab] = useState<HubTab>(initialTab);
  const [leaderboardGame, setLeaderboardGame] = useState<string>(initialLeaderboardGame);
  const [overview, setOverview] = useState<CompetitionsOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [welcomeBanner, setWelcomeBanner] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!savedSession) {
      onPlayerReady?.(null);
      return;
    }

    let cancelled = false;
    setSyncError(null);
    setOverviewLoading(true);
    onPlayerReady?.(savedSession);

    refreshArcadePlayer(savedSession.playerId)
      .then((res) => {
        if (cancelled) return;
        const player = res?.player ?? null;
        if (!player) {
          clearArcadePlayerSession();
          setSavedSession(null);
          setPlayerProfile(null);
          onPlayerReady?.(null);
          return;
        }
        setPlayerProfile(player);
        const updated = saveArcadePlayerSession(player);
        setSavedSession(updated);
        onPlayerReady?.(player);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { status?: number })?.status;
        if (status === 404) {
          clearArcadePlayerSession();
          setSavedSession(null);
          setPlayerProfile(null);
          setSessionNotice(hub.sessionExpiredNotice);
          onPlayerReady?.(null);
        } else {
          setSyncError(
            err instanceof Error
              ? err.message
              : hub.syncOffline('sync')
          );
        }
      });

    fetchCompetitionsOverview(savedSession.playerId)
      .then((res) => {
        if (!cancelled) setOverview(res ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSyncError((prev) =>
          prev ??
          (err instanceof Error
            ? err.message
            : hub.syncOffline('overview'))
        );
      })
      .finally(() => {
        if (!cancelled) setOverviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hub, onPlayerReady, savedSession?.playerId, retryCount]);

  const handleRegistered = (player: PublicArcadePlayer, returning: boolean) => {
    const session = saveArcadePlayerSession(player);
    setPlayerProfile(player);
    setSavedSession(session);
    setSyncError(null);
    setSessionNotice(null);
    setActiveTab('games');
    onPlayerReady?.(player);
    setWelcomeBanner(
      returning ? hub.welcomeBack(player.nickname) : hub.profileReady(player.nickname)
    );
  };

  const handleSwitchPlayer = () => {
    triggerHaptic(6);
    clearArcadePlayerSession();
    setSavedSession(null);
    setPlayerProfile(null);
    setWelcomeBanner(null);
    setSessionNotice(null);
    setSyncError(null);
    onPlayerReady?.(null);
  };

  const dailyEndsAt =
    overview?.dailyCompetition?.endsAt ?? overview?.dailyFallbackWindow?.endsAt;
  const weeklyEndsAt =
    overview?.weeklyCompetition?.endsAt ?? overview?.weeklyFallbackWindow?.endsAt;

  const gameBestSummaries = ARCADE_GAMES.map((game) => {
    const serverBest = playerProfile?.bestScores?.[game.id] ?? 0;
    const localBest = loadLocalBestScore(game.id);
    return {
      game,
      bestScore: Math.max(serverBest, localBest),
    };
  });

  const gamesWithScoreCount = gameBestSummaries.filter((item) => item.bestScore > 0).length;

  const dailyCountdown = dailyEndsAt
    ? formatCountdownRemaining(dailyEndsAt, nowMs)
    : null;
  const weeklyCountdown = weeklyEndsAt
    ? formatCountdownRemaining(weeklyEndsAt, nowMs)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0.05 : 0.18 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${t.meta.brandName} ${hub.arcadeTitleSuffix}`}
      className={`fixed inset-0 z-50 flex h-[100dvh] w-full flex-col bg-[#0B2219] text-[#F7F4EC] overflow-hidden arcade-surface ${
        t.meta.isEthiopic ? 'font-ethiopic' : ''
      }`}
    >
      {/* Compact Sticky App Header */}
      <header className="shrink-0 w-full border-b border-[#245C44]/70 bg-[#0D281D]/95 backdrop-blur-md pt-safe-arcade px-safe-arcade">
        <div className="max-w-5xl mx-auto px-2 sm:px-5 pb-2 pt-0.5 flex items-center justify-between gap-2 min-h-[48px]">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              onClose();
            }}
            aria-label={hub.backToSiteAria}
            className="inline-flex min-h-[44px] px-3 items-center justify-center gap-1.5 rounded-xl bg-[#F7F4EC] hover:bg-white active:scale-[0.97] text-xs sm:text-sm font-bold text-[#143B2B] shadow-[0_2px_0_#071710] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CEF04E]"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>{hub.backToSiteShort}</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#CEF04E] text-[#143B2B] shadow-[0_2px_0_#071710]"
            >
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current">
                <path d="M12.2 3c.6 1.5.1 2.8-.9 3.6 2.1.3 3.7 1.7 3.7 3.5 0 .6-.2 1.2-.5 1.7 1.8.6 3 2 3 3.7 0 2.2-2.4 3.5-5.5 3.5s-5.5-1.3-5.5-3.5c0-1.6 1.1-3 2.7-3.6-.3-.5-.4-1-.4-1.6 0-1.9 1.7-3.3 3.9-3.5-.8-.8-1-2.1-.5-3.8Z" />
              </svg>
            </span>
            <h2 className="font-display text-base sm:text-xl font-bold tracking-tight text-[#F7F4EC] whitespace-nowrap truncate">
              {t.meta.brandName} {hub.arcadeTitleSuffix}
            </h2>
          </div>

          {/* Desktop/Tablet Navigation Tabs + Language Switcher */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {savedSession && (
              <div className="flex items-center gap-1 bg-[#0A1D15] p-1 rounded-xl border border-[#245C44] shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('games')}
                  className={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'games'
                      ? 'bg-[#CEF04E] text-[#143B2B]'
                      : 'text-[#CDE0D6] hover:text-white'
                  }`}
                >
                  {hub.tabs.games}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('leaderboards')}
                  className={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                    activeTab === 'leaderboards'
                      ? 'bg-[#CEF04E] text-[#143B2B]'
                      : 'text-[#CDE0D6] hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 shrink-0" />
                  <span>{hub.tabs.leaderboards}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                    activeTab === 'profile'
                      ? 'bg-[#CEF04E] text-[#143B2B]'
                      : 'text-[#CDE0D6] hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span>{hub.tabs.profile}</span>
                </button>
              </div>
            )}

            <LanguageSelector variant="dark" layoutGroupId="arcade-hub-desktop-lang" compact />
          </div>

          {/* Mobile Compact Player Shortcut (or spacer when logged out) */}
          {savedSession ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(5);
                setActiveTab('profile');
              }}
              aria-label={hub.openProfileAria}
              className="md:hidden inline-flex min-h-[44px] min-w-[44px] px-2.5 items-center justify-center gap-1.5 rounded-xl border border-[#245C44] bg-[#133829] text-xs font-bold text-[#CEF04E] shrink-0 cursor-pointer"
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span className="max-w-[72px] truncate text-[#F7F4EC]">
                {playerProfile?.nickname ?? savedSession.nickname}
              </span>
            </button>
          ) : (
            <div className="md:hidden w-[60px] shrink-0" aria-hidden="true" />
          )}
        </div>
      </header>

      {/* Main Scrollable Hub */}
      {!savedSession ? (
        <ArcadePlayerRegistration
          initialNotice={sessionNotice}
          onRegistered={handleRegistered}
          onBack={onClose}
        />
      ) : (
        <>
          <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-safe-arcade">
            <div className="w-full max-w-5xl mx-auto px-2.5 sm:px-5 pt-3 pb-24 md:pb-8 space-y-3.5">
              {/* Mobile Language Selector Strip inside scrollable hub */}
              <div className="md:hidden flex items-center justify-between gap-2 rounded-2xl border border-[#245C44] bg-[#133829] px-3 py-0.5">
                <span className="text-[11px] font-semibold text-[#9AB7A9]">
                  {t.arcade.languageLabel}
                </span>
                <LanguageSelector variant="dark" layoutGroupId="arcade-hub-mobile-lang" compact />
              </div>

              {welcomeBanner && (
                <div className="rounded-2xl border border-[#CEF04E]/40 bg-[#1B4B37] px-3.5 py-2.5 text-xs text-[#CEF04E] font-medium flex items-center justify-between gap-2">
                  <span>{welcomeBanner}</span>
                  <button
                    type="button"
                    onClick={() => setWelcomeBanner(null)}
                    className="text-[11px] font-bold text-[#F7F4EC]/80 hover:text-white px-2 py-0.5 shrink-0 cursor-pointer"
                  >
                    {hub.dismiss}
                  </button>
                </div>
              )}

              {syncError && activeTab === 'games' && (
                <div
                  role="status"
                  className="rounded-2xl border border-[#FACC15]/40 bg-[#422006]/50 px-3.5 py-2.5 text-xs text-[#FEF08A] flex items-center justify-between gap-3"
                >
                  <span>{hub.syncOffline(syncError)}</span>
                  <button
                    type="button"
                    onClick={() => setRetryCount((n) => n + 1)}
                    className="shrink-0 min-h-[36px] rounded-xl bg-[#FACC15] px-3 py-1 font-bold text-[#143B2B] cursor-pointer whitespace-nowrap"
                  >
                    {hub.retry}
                  </button>
                </div>
              )}

              {activeTab === 'leaderboards' ? (
                <ArcadeLeaderboardView
                  currentPlayerId={savedSession.playerId}
                  initialGameId={leaderboardGame}
                />
              ) : activeTab === 'profile' ? (
                <div className="space-y-4">
                  {/* Player Identity Card */}
                  <div className="rounded-3xl border border-[#245C44] bg-[#133829] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#CEF04E] text-[#143B2B] shadow-[0_3px_0_#0A1F16]">
                        <UserCheck className="w-6 h-6" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-display text-lg sm:text-xl font-bold text-[#F7F4EC] truncate">
                          {playerProfile?.nickname ?? savedSession.nickname}
                        </h3>
                        <p className="text-xs font-mono text-[#9AB7A9] tabular-nums">
                          {playerProfile?.maskedPhone ?? savedSession.maskedPhone} ·{' '}
                          {hub.gamesPlayedFraction(gamesWithScoreCount, ARCADE_GAMES.length)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSwitchPlayer}
                      className="min-h-[44px] px-4 py-2 rounded-xl border border-[#EF4444]/40 bg-[#0B2219] hover:bg-[#7F1D1D]/30 text-xs sm:text-sm font-semibold text-[#FECACA] inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>{hub.switchPlayer}</span>
                    </button>
                  </div>

                  {/* Personal Best Grid Across All 5 Games */}
                  <div className="space-y-2.5">
                    <h4 className="font-display text-sm sm:text-base font-bold text-[#CDE0D6] px-1">
                      {hub.yourBestScores}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {gameBestSummaries.map(({ game, bestScore }) => {
                        const gameText = t.arcade.games[game.id];
                        return (
                          <div
                            key={game.id}
                            className="rounded-2xl border border-[#245C44] bg-[#133829] p-3.5 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="font-display text-sm font-bold text-[#F7F4EC] truncate">
                                {gameText.name}
                              </div>
                              <div className="text-xs font-mono text-[#CEF04E] tabular-nums mt-0.5">
                                {hub.bestPrefix} {bestScore.toLocaleString()}
                              </div>
                            </div>
                            {game.playable && (
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic(10);
                                  onSelectGame(game.id as PlayableArcadeGameId);
                                }}
                                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#CEF04E] hover:bg-[#D9F66A] text-[#143B2B] font-display text-xs font-bold inline-flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                                <span>{hub.play}</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Compact Player Banner */}
                  <div className="rounded-2xl border border-[#245C44] bg-[#133829] px-3.5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0B2219] text-[#CEF04E]">
                        <UserCheck className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-display text-sm sm:text-base font-bold text-[#F7F4EC] truncate">
                          {playerProfile?.nickname ?? savedSession.nickname}
                        </div>
                        <div className="text-[11px] font-mono text-[#9AB7A9] tabular-nums truncate">
                          {playerProfile?.maskedPhone ?? savedSession.maskedPhone} ·{' '}
                          {hub.gamesPlayedFraction(gamesWithScoreCount, ARCADE_GAMES.length)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSwitchPlayer}
                      className="min-h-[44px] px-3 py-1.5 rounded-xl border border-white/15 bg-[#0B2219] hover:bg-white/10 text-xs font-semibold text-[#CDE0D6] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {hub.switchShort}
                    </button>
                  </div>

                  {/* Compact Live Challenges Strip */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(5);
                        setLeaderboardGame('overall');
                        setActiveTab('leaderboards');
                      }}
                      className="text-left rounded-2xl border border-[#245C44] bg-[#133829] hover:border-[#CEF04E]/50 active:scale-[0.99] p-3 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-display text-xs sm:text-sm font-bold text-[#F7F4EC] truncate">
                          {overview?.dailyCompetition?.name ?? hub.dailyDefault}
                        </span>
                        <Clock className="w-3.5 h-3.5 text-[#CEF04E] shrink-0" />
                      </div>
                      <div className="mt-1 font-mono text-xs sm:text-sm font-bold text-[#CEF04E] tabular-nums">
                        {dailyCountdown
                          ? dailyCountdown === 'Ended'
                            ? hub.ended
                            : dailyCountdown
                          : overviewLoading
                          ? hub.loading
                          : hub.live}
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#9AB7A9] truncate">
                        {hub.tapDailyRanks}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(5);
                        setLeaderboardGame('overall');
                        setActiveTab('leaderboards');
                      }}
                      className="text-left rounded-2xl border border-[#245C44] bg-[#133829] hover:border-[#FACC15]/50 active:scale-[0.99] p-3 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-display text-xs sm:text-sm font-bold text-[#F7F4EC] truncate">
                          {overview?.weeklyCompetition?.name ?? hub.weeklyDefault}
                        </span>
                        <Clock className="w-3.5 h-3.5 text-[#FACC15] shrink-0" />
                      </div>
                      <div className="mt-1 font-mono text-xs sm:text-sm font-bold text-[#FACC15] tabular-nums">
                        {weeklyCountdown
                          ? weeklyCountdown === 'Ended'
                            ? hub.ended
                            : weeklyCountdown
                          : hub.live}
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#9AB7A9] truncate">
                        {hub.tapWeeklyPrizes}
                      </p>
                    </button>
                  </div>

                  {/* Responsive 5 Game Cards: Compact One-Handed Cards on Mobile, Rich 2–3 Col Grid on Tablet/Desktop */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch">
                    {gameBestSummaries.map(({ game, bestScore }) => {
                      const gameText = t.arcade.games[game.id];
                      return (
                        <article
                          key={game.id}
                          className="flex flex-col justify-between rounded-2xl border border-[#2D7A58]/80 bg-[#133829] p-3 sm:p-4 shadow-[0_12px_28px_-12px_rgba(0,0,0,0.45)]"
                        >
                          {/* Mobile Compact Row Top + Desktop Vertical Banner */}
                          <div className="flex sm:flex-col gap-3 sm:gap-0 items-center sm:items-stretch">
                            <div className="relative w-28 sm:w-full shrink-0 overflow-hidden rounded-xl border border-[#2D7A58]/70 bg-[#0B2017] aspect-[16/10] sm:aspect-[16/9]">
                              <GameCardArtwork gameId={game.id} />
                              {game.comingSoon && (
                                <div className="absolute inset-0 bg-[#0B2017]/50 flex items-center justify-center">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0E291E]/95 border border-[#2D7A58] text-[11px] font-mono font-bold text-[#F7F4EC]">
                                    <Lock className="w-3 h-3 text-[#FACC15]" />
                                    {hub.soon}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1 sm:mt-3">
                              <div className="flex items-baseline justify-between gap-2">
                                <h3 className="font-display text-base sm:text-lg font-bold text-[#F7F4EC] truncate">
                                  {gameText.name}
                                </h3>
                                <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-mono font-semibold text-[#9AB7A9] tabular-nums shrink-0">
                                  <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FACC15]" />
                                  {game.playable ? bestScore.toLocaleString() : hub.soon}
                                </span>
                              </div>
                              <p className="mt-1 text-xs sm:text-sm text-[#CDE0D6] leading-snug sm:leading-relaxed line-clamp-2">
                                {gameText.shortDescription}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 sm:mt-4 flex items-center gap-2">
                            {game.playable ? (
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic(10);
                                  onSelectGame(game.id as PlayableArcadeGameId);
                                }}
                                className="flex-1 min-h-[46px] px-4 py-2 rounded-xl bg-[#CEF04E] hover:bg-[#D9F66A] active:translate-y-0.5 text-[#143B2B] font-display text-sm font-bold shadow-[0_3px_0_#0A1F16] transition-all inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                              >
                                <Play className="w-4 h-4 fill-current shrink-0" />
                                <span>{hub.play}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="flex-1 min-h-[46px] px-4 py-2 rounded-xl border border-[#245C44] bg-[#0B2219] text-[#9AB7A9] font-display text-sm font-bold opacity-75 inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-not-allowed"
                              >
                                <Lock className="w-3.5 h-3.5 shrink-0" />
                                <span>{hub.comingSoon}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic(6);
                                setLeaderboardGame(game.playable ? game.id : 'overall');
                                setActiveTab('leaderboards');
                              }}
                              aria-label={hub.viewLeaderboardAria(gameText.name)}
                              className="min-h-[46px] px-3.5 py-2 rounded-xl border border-[#2D7A58] bg-[#0B2219] hover:bg-[#194432] text-xs font-semibold text-[#F7F4EC] inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                            >
                              <Trophy className="w-3.5 h-3.5 text-[#FACC15] shrink-0" />
                              <span>{hub.ranks}</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Fixed Bottom Thumb Navigation Bar (Mobile Only) */}
          <nav
            aria-label="Arcade Navigation"
            className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[#245C44] bg-[#0B2219]/95 backdrop-blur-md pb-safe-arcade px-safe-arcade"
          >
            <div className="grid grid-cols-3 h-14 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(5);
                  setActiveTab('games');
                }}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer px-1 ${
                  activeTab === 'games'
                    ? 'text-[#CEF04E]'
                    : 'text-[#9AB7A9] hover:text-[#F7F4EC]'
                }`}
              >
                <Gamepad2 className="w-5 h-5 shrink-0" />
                <span className="truncate max-w-full">{hub.tabs.games}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(5);
                  setActiveTab('leaderboards');
                }}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer px-1 ${
                  activeTab === 'leaderboards'
                    ? 'text-[#CEF04E]'
                    : 'text-[#9AB7A9] hover:text-[#F7F4EC]'
                }`}
              >
                <Trophy className="w-5 h-5 shrink-0" />
                <span className="truncate max-w-full">{hub.tabs.ranksShort}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(5);
                  setActiveTab('profile');
                }}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer px-1 ${
                  activeTab === 'profile'
                    ? 'text-[#CEF04E]'
                    : 'text-[#9AB7A9] hover:text-[#F7F4EC]'
                }`}
              >
                <User className="w-5 h-5 shrink-0" />
                <span className="truncate max-w-full">{hub.tabs.profile}</span>
              </button>
            </div>
          </nav>
        </>
      )}
    </motion.div>
  );
}
