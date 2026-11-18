/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import type {
  PlayableArcadeGameId,
  PublicArcadePlayer,
} from './arcade/arcadeConfig.ts';
import { useLanguage } from './i18n/LanguageContext.tsx';
import { AboutPage } from './components/AboutPage.tsx';
import { ConfirmationScreen } from './components/ConfirmationScreen.tsx';
import {
  DontDropThePoopGame,
  type DontDropResult,
} from './components/DontDropThePoopGame.tsx';
import { FloatingPoops } from './components/FloatingPoops.tsx';
import { GameSelectorModal } from './components/GameSelectorModal.tsx';
import { IntroAnimation } from './components/IntroAnimation.tsx';
import {
  PoopDropGame,
  type PoopDropResult,
} from './components/PoopDropGame.tsx';
import {
  PoopManGame,
  type PoopManGameResult,
} from './components/PoopManGame.tsx';
import {
  PoopRunGame,
  type PoopRunResult,
} from './components/PoopRunGame.tsx';
import {
  RegistrationForm,
  type ConfirmedRegistration,
} from './components/RegistrationForm.tsx';
import {
  ToiletBasketballGame,
  type ToiletBasketballResult,
} from './components/ToiletBasketballGame.tsx';
import {
  clearArcadePlayerSession,
  loadSavedArcadePlayer,
  submitArcadeScore,
  type StoredPlayerSession,
} from './services/arcadeClient.ts';
import { triggerHaptic } from './utils/haptics.ts';

type PageRoute = 'register' | 'about';
type ArcadeView = 'selector' | PlayableArcadeGameId | null;

function getInitialRoute(): PageRoute {
  if (typeof window !== 'undefined') {
    if (window.location.pathname === '/about') return 'about';
  }
  return 'register';
}

export default function App() {
  const { t } = useLanguage();
  const [route, setRoute] = useState<PageRoute>(getInitialRoute);
  const [showIntro, setShowIntro] = useState<boolean>(
    () => getInitialRoute() === 'register'
  );
  const [confirmedRegistration, setConfirmedRegistration] =
    useState<ConfirmedRegistration | null>(null);
  const [formSessionKey, setFormSessionKey] = useState(0);
  const [arcadeView, setArcadeView] = useState<ArcadeView>(null);
  const [activePlayer, setActivePlayer] = useState<
    PublicArcadePlayer | StoredPlayerSession | null
  >(() => loadSavedArcadePlayer());
  const [scoreNotice, setScoreNotice] = useState<string | null>(null);

  const savedScrollYRef = useRef(0);
  const playButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = getInitialRoute();
      setRoute(nextRoute);
      if (nextRoute !== 'register') {
        setShowIntro(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!arcadeView) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [arcadeView]);

  const navigateToAbout = useCallback(() => {
    if (window.location.pathname !== '/about') {
      window.history.pushState({}, '', '/about');
    }
    setShowIntro(false);
    setRoute('about');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const navigateToRegister = useCallback(() => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    setShowIntro(false);
    setConfirmedRegistration(null);
    setRoute('register');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
  }, []);

  const handleRegistrationSuccess = useCallback(
    (registration: ConfirmedRegistration) => {
      setConfirmedRegistration(registration);
    },
    []
  );

  const handleReset = useCallback(() => {
    setConfirmedRegistration(null);
    setFormSessionKey((prev) => prev + 1);
  }, []);

  const handleOpenGame = useCallback(() => {
    triggerHaptic(8);
    savedScrollYRef.current = window.scrollY;
    setScoreNotice(null);
    setArcadeView('selector');
  }, []);

  const handleCloseGame = useCallback(() => {
    const targetScrollY = savedScrollYRef.current;
    setArcadeView(null);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: targetScrollY, behavior: 'instant' as ScrollBehavior });
      playButtonRef.current?.focus();
    });
  }, []);

  const handlePlayerReady = useCallback(
    (player: PublicArcadePlayer | StoredPlayerSession | null) => {
      setActivePlayer(player);
    },
    []
  );

  const handleSubmitRunScore = useCallback(
    async (
      gameId: PlayableArcadeGameId,
      result:
        | PoopManGameResult
        | ToiletBasketballResult
        | PoopDropResult
        | PoopRunResult
        | DontDropResult
    ) => {
      const current = activePlayer ?? loadSavedArcadePlayer();
      if (!current) {
        setScoreNotice(t.arcade.scoreNotices.registerToSave);
        return;
      }

      const playerId = 'id' in current ? current.id : current.playerId;
      if (!playerId) {
        clearArcadePlayerSession();
        setActivePlayer(null);
        setScoreNotice(t.arcade.scoreNotices.registerToSave);
        return;
      }

      let metadata: Record<string, unknown> = {};
      if ('level' in result) {
        metadata = { level: result.level };
      } else if ('shotsMade' in result) {
        metadata = { shotsMade: result.shotsMade, bestStreak: result.bestStreak };
      } else if ('caughtCount' in result) {
        metadata = { caughtCount: result.caughtCount, bestCombo: result.bestCombo };
      } else if ('distanceMeters' in result) {
        metadata = {
          distanceMeters: result.distanceMeters,
          rollsCollected: result.rollsCollected,
        };
      } else if ('gatesCleared' in result) {
        metadata = { gatesCleared: result.gatesCleared, bonusRolls: result.bonusRolls };
      }

      try {
        setScoreNotice(t.arcade.scoreNotices.savingScore);
        const saved = await submitArcadeScore({
          playerId,
          gameId,
          score: result.score,
          sessionId: result.sessionId,
          durationMs: result.durationMs,
          metadata,
        });

        const record = saved?.scoreRecord;
        if (!record) {
          setScoreNotice(t.arcade.scoreNotices.savedLocallyIncomplete);
          return;
        }

        if (saved.bestScores && typeof saved.bestScores === 'object') {
          setActivePlayer((prev) => {
            if (!prev) return prev;
            const prevBest =
              'bestScores' in prev && prev.bestScores ? prev.bestScores : {};
            const mergedBest: Record<string, number> = { ...prevBest };
            for (const [k, v] of Object.entries(saved.bestScores)) {
              if (typeof v === 'number' && Number.isFinite(v)) {
                mergedBest[k] = Math.max(mergedBest[k] ?? 0, v);
              }
            }
            if ('id' in prev) {
              return { ...prev, bestScores: mergedBest };
            }
            return {
              id: prev.playerId,
              nickname: prev.nickname,
              maskedPhone: prev.maskedPhone,
              status: 'active',
              createdAt: new Date().toISOString(),
              bestScores: mergedBest,
            };
          });
        }

        if (record.validationStatus === 'flagged') {
          setScoreNotice(t.arcade.scoreNotices.savedForVerification);
        } else if (record.isNewPersonalBest) {
          setScoreNotice(t.arcade.scoreNotices.savedNewPersonalBest);
        } else {
          setScoreNotice(t.arcade.scoreNotices.savedToLeaderboard);
        }
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        if (status === 404) {
          clearArcadePlayerSession();
          setActivePlayer(null);
        }
        setScoreNotice(
          err instanceof Error
            ? `${t.arcade.scoreNotices.syncSkippedPrefix} ${err.message}`
            : t.arcade.scoreNotices.savedLocallyOffline
        );
      }
    },
    [activePlayer, t]
  );

  const showGameLauncher = !showIntro && arcadeView === null;

  const playerBestScores =
    activePlayer && 'bestScores' in activePlayer && activePlayer.bestScores
      ? activePlayer.bestScores
      : null;

  const poopManBest = playerBestScores?.['poop-man'] ?? 0;
  const basketballBest = playerBestScores?.['toilet-basketball'] ?? 0;
  const poopDropBest = playerBestScores?.['poop-drop'] ?? 0;
  const poopRunBest = playerBestScores?.['poop-run'] ?? 0;
  const dontDropBest = playerBestScores?.['dont-drop-the-poop'] ?? 0;

  return (
    <>
      {route === 'about' ? (
        <div className="pb-16 md:pb-0">
          <AboutPage onNavigateToRegister={navigateToRegister} />
        </div>
      ) : (
        <div className="relative min-h-screen w-full overflow-x-hidden bg-[#F7F4EC] text-[#1B231F]">
          <AnimatePresence mode="wait">
            {showIntro ? (
              <IntroAnimation key="intro" onComplete={handleIntroComplete} />
            ) : (
              <div key="workspace" className="relative min-h-screen w-full pb-16 md:pb-0">
                <FloatingPoops />
                <AnimatePresence mode="wait">
                  {confirmedRegistration ? (
                    <ConfirmationScreen
                      key="confirmation"
                      registration={confirmedRegistration}
                      onReset={handleReset}
                    />
                  ) : (
                    <RegistrationForm
                      key={`form-${formSessionKey}`}
                      onSuccess={handleRegistrationSuccess}
                      onOpenAbout={navigateToAbout}
                    />
                  )}
                </AnimatePresence>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Small Arcade Entry Point */}
      {showGameLauncher && (
        <button
          ref={playButtonRef}
          type="button"
          onClick={handleOpenGame}
          aria-label={t.arcade.launcherAriaLabel}
          className={`fixed bottom-[max(0.85rem,env(safe-area-inset-bottom))] right-3.5 sm:bottom-5 sm:right-5 z-40 inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl border-2 border-[#143B2B] bg-[#CEF04E] hover:bg-[#D8F763] active:translate-y-0.5 text-[#143B2B] ${
            t.meta.isEthiopic ? 'font-ethiopic' : 'font-display'
          } text-xs sm:text-sm font-bold tracking-wide shadow-[0_4px_0_#143B2B] transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#143B2B]`}
        >
          <span
            aria-hidden="true"
            className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#143B2B] text-[#CEF04E]"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
              <path d="M12.2 3c.6 1.5.1 2.8-.9 3.6 2.1.3 3.7 1.7 3.7 3.5 0 .6-.2 1.2-.5 1.7 1.8.6 3 2 3 3.7 0 2.2-2.4 3.5-5.5 3.5s-5.5-1.3-5.5-3.5c0-1.6 1.1-3 2.7-3.6-.3-.5-.4-1-.4-1.6 0-1.9 1.7-3.3 3.9-3.5-.8-.8-1-2.1-.5-3.8Z" />
            </svg>
          </span>
          <span>{t.arcade.launcherButton}</span>
        </button>
      )}

      {/* Full-Screen Arcade Selector & Mini-Game Overlays */}
      <AnimatePresence mode="wait">
        {arcadeView === 'selector' && (
          <GameSelectorModal
            key="game-selector"
            onSelectGame={(gameId) => {
              setScoreNotice(null);
              setArcadeView(gameId);
            }}
            onPlayerReady={handlePlayerReady}
            onClose={handleCloseGame}
          />
        )}
        {arcadeView === 'poop-man' && (
          <PoopManGame
            key="poop-man-game"
            playerNickname={activePlayer?.nickname}
            serverBestScore={poopManBest}
            submissionNotice={scoreNotice}
            onGameComplete={(res) => void handleSubmitRunScore('poop-man', res)}
            onClose={() => setArcadeView('selector')}
          />
        )}
        {arcadeView === 'toilet-basketball' && (
          <ToiletBasketballGame
            key="toilet-basketball-game"
            playerNickname={activePlayer?.nickname}
            serverBestScore={basketballBest}
            submissionNotice={scoreNotice}
            onGameComplete={(res) =>
              void handleSubmitRunScore('toilet-basketball', res)
            }
            onBackToGames={() => setArcadeView('selector')}
          />
        )}
        {arcadeView === 'poop-drop' && (
          <PoopDropGame
            key="poop-drop-game"
            playerNickname={activePlayer?.nickname}
            serverBestScore={poopDropBest}
            submissionNotice={scoreNotice}
            onGameComplete={(res) => void handleSubmitRunScore('poop-drop', res)}
            onBackToGames={() => setArcadeView('selector')}
          />
        )}
        {arcadeView === 'poop-run' && (
          <PoopRunGame
            key="poop-run-game"
            playerNickname={activePlayer?.nickname}
            serverBestScore={poopRunBest}
            submissionNotice={scoreNotice}
            onGameComplete={(res) => void handleSubmitRunScore('poop-run', res)}
            onBackToGames={() => setArcadeView('selector')}
          />
        )}
        {arcadeView === 'dont-drop-the-poop' && (
          <DontDropThePoopGame
            key="dont-drop-game"
            playerNickname={activePlayer?.nickname}
            serverBestScore={dontDropBest}
            submissionNotice={scoreNotice}
            onGameComplete={(res) =>
              void handleSubmitRunScore('dont-drop-the-poop', res)
            }
            onBackToGames={() => setArcadeView('selector')}
          />
        )}
      </AnimatePresence>
    </>
  );
}
