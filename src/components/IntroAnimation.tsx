import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import { triggerHaptic } from '../utils/haptics.ts';

interface IntroAnimationProps {
  onComplete: () => void;
}

const INTRO_DURATION_MS = 4200;

export function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const { t } = useLanguage();
  const [phraseIndex] = useState<number>(() =>
    Math.floor(Math.random() * 4)
  );
  const selectedPhrase = t.intro.phrases[phraseIndex] ?? t.intro.phrases[0];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onComplete();
    }, INTRO_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex h-[100dvh] flex-col items-center justify-center bg-[#F7F4EC] px-4 py-6 sm:px-6 sm:py-8 pt-safe pb-safe overflow-hidden"
    >
      <div className="flex flex-col items-center justify-center w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-2.5 sm:mb-3 text-center"
        >
          <span className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#143B2B]">
            {t.meta.brandName}
          </span>
        </motion.div>

        {/* Cartoon Speech Bubble Positioned Directly Above the Sad Poop Character */}
        <motion.div
          initial={{ opacity: 0, scale: 0.65, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 380,
            damping: 20,
            delay: 0.45,
          }}
          className="relative z-10 -mb-3 flex flex-col items-center"
        >
          <div className="w-fit max-w-[min(272px,calc(100vw-32px))] sm:max-w-[320px] rounded-2xl bg-white border-[2.5px] border-[#143B2B] px-3.5 py-2 sm:px-4 sm:py-2.5 text-center shadow-[0_6px_0_rgba(20,59,43,0.12)]">
            <p
              lang={t.meta.htmlLang}
              className={`${t.meta.isEthiopic ? 'font-ethiopic' : ''} text-[15px] sm:text-base font-semibold leading-snug text-[#143B2B] break-words`}
            >
              {selectedPhrase}
            </p>
          </div>
          {/* Speech Bubble Pointer Directed Toward the Poop Character */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 14"
            className="-mt-[2.5px] w-6 h-3.5 overflow-visible"
          >
            <path
              d="M3 0 L12 12 L21 0"
              fill="#FFFFFF"
              stroke="#143B2B"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <line x1="4" y1="0" x2="20" y2="0" stroke="#FFFFFF" strokeWidth="3.5" />
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-56 h-56 sm:w-72 sm:h-72 flex items-center justify-center"
        >
          <svg
            viewBox="0 0 280 280"
            className="w-full h-full drop-shadow-[0_18px_28px_rgba(20,59,43,0.10)]"
            role="img"
            aria-label="Cute sad poop sitting in a minimal toilet illustration"
          >
            {/* Floor shadow */}
            <ellipse cx="140" cy="248" rx="74" ry="11" fill="#143B2B" fillOpacity="0.09" />

            {/* Toilet Tank */}
            <rect
              x="76"
              y="34"
              width="128"
              height="74"
              rx="14"
              fill="#FFFFFF"
              stroke="#143B2B"
              strokeWidth="4"
            />
            {/* Tank Lid */}
            <rect
              x="70"
              y="26"
              width="140"
              height="16"
              rx="8"
              fill="#FFFFFF"
              stroke="#143B2B"
              strokeWidth="4"
            />
            {/* Playful Lime Flush Button */}
            <rect
              x="128"
              y="22"
              width="24"
              height="6"
              rx="3"
              fill="#CEF04E"
              stroke="#143B2B"
              strokeWidth="2.5"
            />

            {/* Toilet Pedestal Base */}
            <path
              d="M92 162 L98 228 C99 238 110 243 140 243 C170 243 181 238 182 228 L188 162 Z"
              fill="#F2EFE6"
              stroke="#143B2B"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* Toilet Outer Bowl */}
            <path
              d="M66 130 C66 178 96 202 140 202 C184 202 214 178 214 130 Z"
              fill="#FFFFFF"
              stroke="#143B2B"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* Toilet Inner Bowl Rim Back */}
            <ellipse
              cx="140"
              cy="128"
              rx="78"
              ry="26"
              fill="#FFFFFF"
              stroke="#143B2B"
              strokeWidth="4"
            />
            {/* Bowl Opening Shading */}
            <ellipse
              cx="140"
              cy="129"
              rx="61"
              ry="18"
              fill="#E5ECE8"
              stroke="#143B2B"
              strokeWidth="3"
            />

            {/* Cute Sad Poop Character Sitting Inside Bowl */}
            <motion.g
              animate={{
                y: [0, 3, 0],
                scaleY: [1, 0.965, 1],
              }}
              transition={{
                duration: 2.1,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{ transformOrigin: '140px 136px' }}
            >
              {/* Poop Bottom Tier */}
              <path
                d="M95 132 C95 118 108 110 140 110 C172 110 185 118 185 132 C185 141 170 145 140 145 C110 145 95 141 95 132 Z"
                fill="#7B4E2D"
                stroke="#2E1B0E"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              {/* Poop Middle Tier */}
              <path
                d="M104 114 C104 98 118 90 140 90 C162 90 176 98 176 114 C176 122 162 125 140 125 C118 125 104 122 104 114 Z"
                fill="#855532"
                stroke="#2E1B0E"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              {/* Poop Top Swirl */}
              <path
                d="M117 94 C117 79 128 73 140 72 C146 66 144 58 139 55 C149 56 158 65 157 76 C162 80 164 86 163 94 C163 100 153 103 140 103 C127 103 117 100 117 94 Z"
                fill="#8F5C38"
                stroke="#2E1B0E"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              {/* Soft Highlight */}
              <path
                d="M114 111 C116 104 121 101 126 100"
                fill="none"
                stroke="#B07D56"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Sad Eyebrows (subtle droop) */}
              <motion.path
                d="M119 98 Q125 96 130 93"
                fill="none"
                stroke="#2E1B0E"
                strokeWidth="2.8"
                strokeLinecap="round"
                animate={{ y: [0, 1.2, 0] }}
                transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.path
                d="M161 98 Q155 96 150 93"
                fill="none"
                stroke="#2E1B0E"
                strokeWidth="2.8"
                strokeLinecap="round"
                animate={{ y: [0, 1.2, 0] }}
                transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Expressive Blinking Sad Eyes */}
              <g className="animate-blink-eye">
                <circle cx="126" cy="108" r="6.5" fill="#FFFFFF" stroke="#2E1B0E" strokeWidth="2.2" />
                <circle cx="127" cy="109" r="3.4" fill="#1B231F" />
                <circle cx="125.5" cy="107.2" r="1.3" fill="#FFFFFF" />

                <circle cx="154" cy="108" r="6.5" fill="#FFFFFF" stroke="#2E1B0E" strokeWidth="2.2" />
                <circle cx="153" cy="109" r="3.4" fill="#1B231F" />
                <circle cx="151.5" cy="107.2" r="1.3" fill="#FFFFFF" />
              </g>

              {/* Tiny Glistening Tear Drop */}
              <motion.path
                d="M119 114 C117 117 117 120 119 121 C121 122 123 119 121 116 Z"
                fill="#7DD3FC"
                stroke="#143B2B"
                strokeWidth="1.2"
                animate={{ opacity: [0.5, 1, 0.5], y: [0, 2, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Unhappy Downturned Mouth */}
              <path
                d="M133 124 Q140 118 147 124"
                fill="none"
                stroke="#2E1B0E"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </motion.g>

            {/* Front Rim Overlap Mask so character sits neatly INSIDE bowl */}
            <path
              d="M66 130 C76 146 105 154 140 154 C175 154 204 146 214 130"
              fill="none"
              stroke="#143B2B"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>

        {/* Subtle Progress Track + Skip Control */}
        <div className="mt-5 flex flex-col items-center gap-4 w-48">
          <div className="w-full h-1 rounded-full bg-[#143B2B]/12 overflow-hidden">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: INTRO_DURATION_MS / 1000, ease: 'linear' }}
              style={{ transformOrigin: 'left' }}
              className="h-full w-full bg-[#143B2B] rounded-full"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(6);
              onComplete();
            }}
            className="min-h-[44px] min-w-[44px] px-5 py-2 rounded-xl border border-[#143B2B]/20 bg-white/80 hover:bg-white text-sm font-medium text-[#143B2B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#143B2B] cursor-pointer"
          >
            {t.intro.skip}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
