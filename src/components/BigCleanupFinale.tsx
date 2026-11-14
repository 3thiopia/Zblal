import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import { triggerHaptic } from '../utils/haptics.ts';
import { AboutToiletArt } from './AboutToiletArt.tsx';

import { PoopSpeechBubble } from './PoopSpeechBubble.tsx';

interface BigCleanupFinaleProps {
  onRegisterNow: () => void;
}

type CleanupStage = 'messy' | 'flushing' | 'clean';

export function BigCleanupFinale({ onRegisterNow }: BigCleanupFinaleProps) {
  const { t } = useLanguage();
  const [stage, setStage] = useState<CleanupStage>('messy');
  const prefersReducedMotion = useReducedMotion();
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const handleFixIt = () => {
    if (stage !== 'messy') return;
    triggerHaptic([12, 30, 18]);
    clearTimers();
    setStage('flushing');

    const finishDelay = prefersReducedMotion ? 350 : 1850;
    const t = window.setTimeout(() => {
      setStage('clean');
      triggerHaptic([10, 20, 15]);
    }, finishDelay);
    timersRef.current.push(t);
  };

  const handleReplay = () => {
    triggerHaptic(8);
    clearTimers();
    setStage('messy');
  };

  const isClean = stage === 'clean';
  const isFlushing = stage === 'flushing';

  return (
    <section
      aria-label={t.about.title}
      className={`relative overflow-hidden rounded-[26px] md:rounded-[34px] border transition-colors duration-1000 px-4 py-6 md:px-10 md:py-14 ${
        isClean
          ? 'bg-gradient-to-b from-[#F3FCF7] via-[#FFFFFF] to-[#ECF9F1] border-[#BBE5CD] shadow-[0_24px_60px_-20px_rgba(20,59,43,0.16)]'
          : isFlushing
          ? 'bg-gradient-to-b from-[#F2F7F3] via-[#FAF9F4] to-[#EFF6F1] border-[#D3DCD4]'
          : 'bg-gradient-to-b from-[#F5EFE3] via-[#F2E9D8] to-[#E8DAC2] border-[#D8C5A5] shadow-[0_20px_50px_-24px_rgba(92,55,28,0.22)]'
      }`}
    >
      {/* Clean Fresh Glow Overlay */}
      <AnimatePresence>
        {isClean && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-radial from-[#CEF04E]/22 via-transparent to-transparent"
          />
        )}
      </AnimatePresence>

      {/* Playful Cartoon Messy Liquid Waves & Blobs (Drain downward on FIX IT) */}
      <motion.div
        aria-hidden="true"
        animate={
          stage === 'messy'
            ? { y: 0, opacity: 1, scaleY: 1 }
            : stage === 'flushing'
            ? { y: 120, opacity: 0, scaleY: 0.45 }
            : { y: 140, opacity: 0, scaleY: 0.2 }
        }
        transition={{ duration: prefersReducedMotion ? 0.3 : 1.45, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformOrigin: 'bottom' }}
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Top Incoming Cartoon Stream */}
        <svg
          viewBox="0 0 400 120"
          preserveAspectRatio="none"
          className="mx-auto w-24 md:w-36 h-14 md:h-20 -mt-2"
        >
          <path
            d="M170 0 C175 40 155 75 182 115 L224 115 C244 75 225 40 230 0 Z"
            fill="#85532E"
            fillOpacity="0.88"
          />
          <path
            d="M188 8 C190 42 182 72 194 106"
            fill="none"
            stroke="#B47C50"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>

        {/* Bottom Cartoon Liquid Puddle */}
        <svg
          viewBox="0 0 800 180"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 w-full h-24 md:h-36"
        >
          <path
            d="M0 95 Q110 45 220 92 T440 85 T650 92 T800 78 L800 180 L0 180 Z"
            fill="#7B4C29"
            fillOpacity="0.86"
          />
          <path
            d="M0 122 Q140 82 280 118 T560 112 T800 116 L800 180 L0 180 Z"
            fill="#663D1F"
            fillOpacity="0.92"
          />
          {/* Playful Cartoon Bubbles */}
          <circle cx="130" cy="112" r="10" fill="#A46D42" />
          <circle cx="295" cy="96" r="7" fill="#A46D42" />
          <circle cx="520" cy="116" r="12" fill="#A46D42" />
          <circle cx="675" cy="100" r="8" fill="#A46D42" />
        </svg>

        {/* Side Cartoon Splat Accents */}
        <div className="hidden md:block absolute top-14 left-10 w-10 h-10 rounded-full bg-[#8B5730]/30 blur-[1px]" />
        <div className="hidden md:block absolute top-24 right-12 w-14 h-7 rounded-full bg-[#7A4B28]/25 -rotate-12" />
      </motion.div>

      {/* Main Interactive Stage Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Happy Speech Bubble After Transformation Completes */}
        <div className="min-h-[52px] md:min-h-[76px] flex items-end justify-center -mb-2 md:-mb-3 relative z-20">
          <AnimatePresence>
            {isClean && (
              <PoopSpeechBubble
                key="happy-bubble"
                text={t.about.finale.happyBubble}
                size="lg"
                variant="happy"
                pointerDirection="down"
                floatOffset={4}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-72 md:h-72">
          <AboutToiletArt
            mood={isClean ? 'happy' : isFlushing ? 'flushing' : 'sad'}
            spotless={isClean}
            showLiquidOutflow={stage === 'messy'}
          />
        </div>

        {/* Action Area: FIX IT! -> Final Message & REGISTER NOW */}
        <div className="mt-3 md:mt-6 w-full max-w-md min-h-[116px] md:min-h-[140px] flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {stage !== 'clean' ? (
              <motion.div
                key="fix-cta"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -6 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center gap-3 w-full"
              >
                <p className="text-sm md:text-base font-medium text-[#4D3B2A]">
                  {isFlushing
                    ? t.about.finale.flushingText
                    : t.about.finale.messyText}
                </p>

                <motion.button
                  type="button"
                  disabled={isFlushing}
                  onClick={handleFixIt}
                  whileTap={isFlushing ? undefined : { scale: 0.97, y: 2 }}
                  className={`w-full md:w-auto min-h-[54px] md:min-h-[56px] px-8 md:px-10 py-3.5 rounded-2xl border-[3px] border-[#143B2B] font-display text-xl md:text-2xl font-bold tracking-wide transition-all cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#143B2B] ${
                    isFlushing
                      ? 'bg-[#E2EEB6] text-[#143B2B]/70 shadow-none cursor-wait'
                      : 'bg-[#CEF04E] md:hover:bg-[#D7F564] active:bg-[#C3E544] text-[#143B2B] shadow-[0_6px_0_#143B2B]'
                  }`}
                >
                  {isFlushing
                    ? t.about.finale.cleaningButton
                    : t.about.finale.fixItButton}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="solved-cta"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-4 md:gap-5 w-full"
              >
                <div className="inline-flex items-center gap-2 text-[#143B2B]">
                  <Sparkles className="w-5 h-5 text-[#6E8F00] shrink-0" />
                  <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-[#143B2B] text-balance">
                    {t.about.finale.solvedHeading}
                  </h2>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center gap-2.5 md:gap-3 w-full">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      triggerHaptic(12);
                      onRegisterNow();
                    }}
                    className="w-full md:w-auto min-h-[54px] md:min-h-[52px] px-8 py-3.5 rounded-2xl bg-[#143B2B] md:hover:bg-[#0D291D] active:bg-[#0B2218] text-white font-display text-base font-bold tracking-wider flex items-center justify-center gap-2.5 shadow-[0_12px_26px_-10px_rgba(20,59,43,0.45)] transition-colors cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#143B2B]"
                  >
                    <span>{t.about.finale.registerNowButton}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReplay}
                    className="w-full md:w-auto min-h-[48px] px-5 py-3 rounded-2xl border border-[#143B2B]/20 bg-white/85 md:hover:bg-white active:bg-[#F2EFE6] text-sm font-semibold text-[#143B2B] flex items-center justify-center gap-2 transition-colors cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#143B2B]"
                  >
                    <RotateCcw className="w-4 h-4 shrink-0" />
                    <span>{t.about.finale.replayButton}</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
