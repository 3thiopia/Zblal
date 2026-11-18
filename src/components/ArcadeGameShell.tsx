import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics.ts';

interface ArcadeGameShellProps {
  title: string;
  ariaLabel: string;
  accentIcon?: ReactNode;
  muted: boolean;
  isPaused: boolean;
  canPause: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onBackToGames: () => void;
  hudLeft: ReactNode;
  hudRight?: ReactNode;
  stageRef?: React.RefObject<HTMLDivElement | null>;
  mobileControls?: ReactNode;
  desktopLegend?: ReactNode;
  children: ReactNode;
}

export function ArcadeGameShell({
  title,
  ariaLabel,
  accentIcon,
  muted,
  isPaused,
  canPause,
  onToggleMute,
  onTogglePause,
  onRestart,
  onBackToGames,
  hudLeft,
  hudRight,
  stageRef,
  mobileControls,
  desktopLegend,
  children,
}: ArcadeGameShellProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0.05 : 0.18 }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col bg-[#0B2219] text-[#F7F4EC] pt-safe-arcade pb-safe-arcade px-safe-arcade overflow-hidden arcade-surface"
    >
      {/* Top Native App Bar + Compact HUD */}
      <header className="shrink-0 w-full max-w-5xl mx-auto px-1.5 sm:px-4 pt-1 pb-1.5 flex flex-col gap-1.5 [@media(max-height:520px)_and_(orientation:landscape)]:pb-1 [@media(max-height:520px)_and_(orientation:landscape)]:gap-1">
        <div className="flex items-center justify-between gap-2 min-h-[44px]">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                onBackToGames();
              }}
              aria-label="Back to arcade games"
              className="inline-flex min-h-[44px] px-3 items-center justify-center gap-1.5 rounded-xl bg-[#F7F4EC] hover:bg-white active:scale-[0.97] text-xs sm:text-sm font-bold text-[#143B2B] shadow-[0_2px_0_#071710] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CEF04E]"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Games</span>
            </button>

            <div className="flex items-center gap-2 min-w-0">
              {accentIcon && (
                <span
                  aria-hidden="true"
                  className="hidden xs:inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#CEF04E] text-[#143B2B] shadow-[0_2px_0_#071710]"
                >
                  {accentIcon}
                </span>
              )}
              <h2 className="font-display text-base sm:text-xl font-bold tracking-tight text-[#F7F4EC] truncate">
                {title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(5);
                onToggleMute();
              }}
              aria-label={muted ? 'Unmute sound' : 'Mute sound'}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#245C44] bg-[#143B2B] hover:bg-[#1B4B37] active:scale-[0.96] text-[#F7F4EC] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CEF04E]"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onTogglePause}
              disabled={!canPause}
              aria-label={isPaused ? 'Resume game' : 'Pause game'}
              className="inline-flex min-h-[44px] min-w-[44px] sm:px-3 items-center justify-center gap-1.5 rounded-xl border border-[#245C44] bg-[#143B2B] hover:bg-[#1B4B37] active:scale-[0.96] disabled:opacity-40 text-xs font-semibold text-[#F7F4EC] transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CEF04E]"
            >
              {isPaused ? (
                <Play className="w-4 h-4 text-[#CEF04E]" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              type="button"
              onClick={onRestart}
              aria-label="Restart game"
              className="inline-flex min-h-[44px] min-w-[44px] sm:px-3 items-center justify-center gap-1.5 rounded-xl border border-[#245C44] bg-[#143B2B] hover:bg-[#1B4B37] active:scale-[0.96] text-xs font-semibold text-[#F7F4EC] transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CEF04E]"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Restart</span>
            </button>
          </div>
        </div>

        {/* Unboxed HUD Strip */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1.5 rounded-xl bg-[#133829] border border-[#245C44] text-xs sm:text-sm tabular-nums">
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">{hudLeft}</div>
          {hudRight && (
            <div className="flex items-center gap-3 shrink-0 ml-auto">{hudRight}</div>
          )}
        </div>
      </header>

      {/* Main Content Area: Vertical in Portrait, Side-by-Side Handheld in Short Landscape */}
      <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto px-1 sm:px-4 flex flex-col [@media(max-height:520px)_and_(orientation:landscape)]:flex-row items-stretch gap-1.5 sm:gap-2">
        {/* Stage Container */}
        <div
          ref={stageRef}
          className="relative flex-1 min-h-0 min-w-0 flex items-center justify-center"
        >
          {children}
        </div>

        {/* Mobile/Tablet Thumb Controls Dock */}
        {mobileControls && (
          <div className="shrink-0 lg:hidden px-1 pb-1 pt-0.5 flex items-center justify-center touch-none [@media(max-height:520px)_and_(orientation:landscape)]:w-44 [@media(max-height:520px)_and_(orientation:landscape)]:flex-col [@media(max-height:520px)_and_(orientation:landscape)]:justify-center [@media(max-height:520px)_and_(orientation:landscape)]:py-1">
            {mobileControls}
          </div>
        )}
      </div>

      {/* Desktop Keyboard Legend */}
      {desktopLegend && (
        <footer className="hidden lg:flex shrink-0 w-full max-w-5xl mx-auto px-4 pt-1 pb-1.5 items-center justify-center gap-4 text-xs text-[#9AB7A9]">
          {desktopLegend}
        </footer>
      )}
    </motion.div>
  );
}

export function ArcadeOverlayCard({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-[#0A1E16]/90 backdrop-blur-[3px] p-3 sm:p-5 text-center overflow-y-auto">
      <div className="w-full max-w-xs my-auto rounded-2xl border border-[#2D7A58]/70 bg-[#123627]/95 p-4 sm:p-5 shadow-[0_18px_40px_rgba(0,0,0,0.5)]">
        {children}
      </div>
    </div>
  );
}
