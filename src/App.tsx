/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { AboutPage } from './components/AboutPage.tsx';
import { ConfirmationScreen } from './components/ConfirmationScreen.tsx';
import { FloatingPoops } from './components/FloatingPoops.tsx';
import { IntroAnimation } from './components/IntroAnimation.tsx';
import { PoopManGame } from './components/PoopManGame.tsx';
import {
  RegistrationForm,
  type ConfirmedRegistration,
} from './components/RegistrationForm.tsx';
import { triggerHaptic } from './utils/haptics.ts';

type PageRoute = 'register' | 'about';

function getInitialRoute(): PageRoute {
  if (typeof window !== 'undefined' && window.location.pathname === '/about') {
    return 'about';
  }
  return 'register';
}

export default function App() {
  const [route, setRoute] = useState<PageRoute>(getInitialRoute);
  const [showIntro, setShowIntro] = useState<boolean>(() => getInitialRoute() === 'register');
  const [confirmedRegistration, setConfirmedRegistration] =
    useState<ConfirmedRegistration | null>(null);
  const [formSessionKey, setFormSessionKey] = useState(0);
  const [isGameOpen, setIsGameOpen] = useState(false);

  const savedScrollYRef = useRef(0);
  const playButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = getInitialRoute();
      setRoute(nextRoute);
      if (nextRoute === 'about') {
        setShowIntro(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!isGameOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isGameOpen]);

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
    setIsGameOpen(true);
  }, []);

  const handleCloseGame = useCallback(() => {
    const targetScrollY = savedScrollYRef.current;
    setIsGameOpen(false);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: targetScrollY, behavior: 'instant' as ScrollBehavior });
      playButtonRef.current?.focus();
    });
  }, []);

  const showGameLauncher = !showIntro && !isGameOpen;

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
          aria-label="Play POOP MAN mini-game"
          className="fixed bottom-[max(0.85rem,env(safe-area-inset-bottom))] right-3.5 sm:bottom-5 sm:right-5 z-40 inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl border-2 border-[#143B2B] bg-[#CEF04E] hover:bg-[#D8F763] active:translate-y-0.5 text-[#143B2B] font-display text-xs sm:text-sm font-bold tracking-wide shadow-[0_4px_0_#143B2B] transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#143B2B]"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#143B2B] text-[#CEF04E]"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
              <path d="M12.2 3c.6 1.5.1 2.8-.9 3.6 2.1.3 3.7 1.7 3.7 3.5 0 .6-.2 1.2-.5 1.7 1.8.6 3 2 3 3.7 0 2.2-2.4 3.5-5.5 3.5s-5.5-1.3-5.5-3.5c0-1.6 1.1-3 2.7-3.6-.3-.5-.4-1-.4-1.6 0-1.9 1.7-3.3 3.9-3.5-.8-.8-1-2.1-.5-3.8Z" />
            </svg>
          </span>
          <span>PLAY POOP MAN</span>
        </button>
      )}

      {/* Full-Screen Mini-Game Overlay */}
      <AnimatePresence>
        {isGameOpen && <PoopManGame key="poop-man-game" onClose={handleCloseGame} />}
      </AnimatePresence>
    </>
  );
}
