import { motion, useReducedMotion } from 'motion/react';
import { useLanguage } from '../i18n/LanguageContext.tsx';

interface PoopSpeechBubbleProps {
  text: string;
  size?: 'sm' | 'md' | 'lg';
  pointerDirection?: 'down' | 'left' | 'right';
  variant?: 'default' | 'happy';
  delay?: number;
  floatOffset?: number;
  className?: string;
}

export function PoopSpeechBubble({
  text,
  size = 'md',
  pointerDirection = 'down',
  variant = 'default',
  delay = 0,
  floatOffset = 4,
  className = '',
}: PoopSpeechBubbleProps) {
  const prefersReducedMotion = useReducedMotion();
  const { t } = useLanguage();

  const bubbleSizeClasses =
    size === 'lg'
      ? 'max-w-[min(280px,calc(100vw-48px))] sm:max-w-[340px] px-4 py-2.5 sm:px-5 sm:py-3 text-lg sm:text-2xl font-bold'
      : size === 'sm'
      ? 'max-w-[min(210px,calc(100vw-112px))] sm:max-w-[260px] px-3 py-2 sm:px-3.5 text-[13.5px] sm:text-[15px] font-semibold'
      : 'max-w-[min(264px,calc(100vw-48px))] sm:max-w-[330px] px-3.5 py-2 sm:px-4 sm:py-2.5 text-[14.5px] sm:text-base font-semibold';

  const bgClass =
    variant === 'happy'
      ? 'bg-[#FFFDF5] border-[#143B2B] shadow-[0_7px_0_rgba(20,59,43,0.14),0_0_24px_rgba(206,240,78,0.45)]'
      : 'bg-white border-[#143B2B] shadow-[0_6px_0_rgba(20,59,43,0.12)]';

  const fillHex = variant === 'happy' ? '#FFFDF5' : '#FFFFFF';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.68, y: 10 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        type: 'spring',
        stiffness: 360,
        damping: 21,
        delay,
      }}
      className={`relative inline-flex ${
        pointerDirection === 'left' || pointerDirection === 'right'
          ? 'flex-row items-center'
          : 'flex-col items-center'
      } ${className}`}
    >
      <motion.div
        animate={
          prefersReducedMotion
            ? undefined
            : { y: [0, -floatOffset, 0] }
        }
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`relative inline-flex ${
          pointerDirection === 'left' || pointerDirection === 'right'
            ? 'flex-row items-center'
            : 'flex-col items-center'
        }`}
      >
        {pointerDirection === 'left' && (
          <svg
            aria-hidden="true"
            viewBox="0 0 14 24"
            className="-mr-[2.5px] z-10 w-3.5 h-6 shrink-0 overflow-visible"
          >
            <path
              d="M14 3 L2 12 L14 21"
              fill={fillHex}
              stroke="#143B2B"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <line x1="14" y1="4" x2="14" y2="20" stroke={fillHex} strokeWidth="3.5" />
          </svg>
        )}

        <div
          className={`w-fit rounded-2xl border-[2.5px] text-center leading-snug text-[#143B2B] ${bgClass} ${bubbleSizeClasses}`}
        >
          <p
            lang={t.meta.htmlLang}
            className={`${t.meta.isEthiopic ? 'font-ethiopic' : ''} break-words`}
          >
            {text}
          </p>
        </div>

        {/* Cartoon Pointer */}
        {pointerDirection === 'down' && (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 14"
            className="-mt-[2.5px] w-6 h-3.5 shrink-0 overflow-visible"
          >
            <path
              d="M3 0 L12 12 L21 0"
              fill={fillHex}
              stroke="#143B2B"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <line x1="4" y1="0" x2="20" y2="0" stroke={fillHex} strokeWidth="3.5" />
          </svg>
        )}

        {pointerDirection === 'right' && (
          <svg
            aria-hidden="true"
            viewBox="0 0 14 24"
            className="-ml-[2.5px] z-10 w-3.5 h-6 shrink-0 overflow-visible"
          >
            <path
              d="M0 3 L12 12 L0 21"
              fill={fillHex}
              stroke="#143B2B"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <line x1="0" y1="4" x2="0" y2="20" stroke={fillHex} strokeWidth="3.5" />
          </svg>
        )}
      </motion.div>
    </motion.div>
  );
}

interface MiniStreamPoopProps {
  phrase: string;
  align?: 'left' | 'right';
  delay?: number;
}

export function MiniStreamPoop({
  phrase,
  align = 'left',
  delay = 0,
}: MiniStreamPoopProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }}
      className={`flex items-center gap-2.5 sm:gap-3 ${
        align === 'right' ? 'md:flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Cute Small Expressive Poop Character Along the Flowing Stream */}
      <motion.div
        animate={
          prefersReducedMotion
            ? undefined
            : { y: [0, -3.5, 0], rotate: [-2, 2, -2] }
        }
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 select-none"
      >
        <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_6px_10px_rgba(46,27,14,0.16)]" aria-hidden="true">
          <path
            d="M11 48 C11 39 19 35 32 35 C45 35 53 39 53 48 C53 54 44 57 32 57 C20 57 11 54 11 48 Z"
            fill="#7D4E2C"
            stroke="#2E1B0E"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M16 36 C16 26 23 22 32 22 C41 22 48 26 48 36 C48 41 41 43 32 43 C23 43 16 41 16 36 Z"
            fill="#895732"
            stroke="#2E1B0E"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M22 23 C22 14 27 10 32 9 C35 6 34 3 31 2 C37 3 41 8 40 14 C43 16 44 19 43 23 C43 26 38 28 32 28 C26 28 22 26 22 23 Z"
            fill="#956038"
            stroke="#2E1B0E"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Dramatic Funny Eyes */}
          <circle cx="25.5" cy="34.5" r="3.6" fill="#FFFFFF" stroke="#2E1B0E" strokeWidth="1.5" />
          <circle cx="26" cy="35" r="1.8" fill="#1B231F" />
          <circle cx="38.5" cy="34.5" r="3.6" fill="#FFFFFF" stroke="#2E1B0E" strokeWidth="1.5" />
          <circle cx="38" cy="35" r="1.8" fill="#1B231F" />
          {/* Surprised / Worried Mouth */}
          <ellipse cx="32" cy="45" rx="3.4" ry="2.6" fill="#2E1B0E" />
        </svg>
      </motion.div>

      {/* Mobile always points left toward character; desktop alternates left/right */}
      <div className={align === 'right' ? 'hidden md:block' : 'block'}>
        <PoopSpeechBubble
          text={phrase}
          size="sm"
          pointerDirection={align === 'right' ? 'right' : 'left'}
          delay={delay + 0.08}
          floatOffset={3}
        />
      </div>
      {align === 'right' && (
        <div className="block md:hidden">
          <PoopSpeechBubble
            text={phrase}
            size="sm"
            pointerDirection="left"
            delay={delay + 0.08}
            floatOffset={3}
          />
        </div>
      )}
    </motion.div>
  );
}
