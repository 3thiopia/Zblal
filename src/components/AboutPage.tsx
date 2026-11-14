import { useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowLeft, Timer, Truck, Zap } from 'lucide-react';
import { SERVICE_TIERS, type ServicePriorityCode } from '../config/popoConfig.ts';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import { formatLocalizedTierPrice } from '../i18n/translations.ts';
import { triggerHaptic } from '../utils/haptics.ts';
import { AboutToiletArt } from './AboutToiletArt.tsx';
import { BigCleanupFinale } from './BigCleanupFinale.tsx';
import { LanguageSelector } from './LanguageSelector.tsx';
import { MiniStreamPoop, PoopSpeechBubble } from './PoopSpeechBubble.tsx';

interface AboutPageProps {
  onNavigateToRegister: () => void;
}

function shuffleIndices(count: number): number[] {
  const copy = Array.from({ length: count }, (_, i) => i);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function AboutPage({ onNavigateToRegister }: AboutPageProps) {
  const { language, t } = useLanguage();
  const storyRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const [topPhraseIndex] = useState<number>(() =>
    Math.floor(Math.random() * 4)
  );
  const topPhrase =
    t.about.topToiletPhrases[topPhraseIndex] ?? t.about.topToiletPhrases[0];

  const [streamIndices] = useState<number[]>(() => shuffleIndices(5));
  const streamPhrases = streamIndices.map(
    (idx) => t.about.streamPhrases[idx] ?? t.about.streamPhrases[0]
  );

  const { scrollYProgress } = useScroll({
    target: storyRef,
    offset: ['start center', 'end center'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 26,
    restDelta: 0.001,
  });

  const streamScaleY = useTransform(smoothProgress, [0, 1], [0.06, 1]);

  const getTierIcon = (code: ServicePriorityCode) => {
    switch (code) {
      case 'STANDARD':
        return Truck;
      case 'PREMIUM':
        return Timer;
      case 'SUPER_FAST':
        return Zap;
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#F7F4EC] text-[#1B231F] overflow-x-hidden">
      {/* Minimal Top Bar: Zblal Brand + Language Selector + Single Return Link */}
      <header className="sticky top-0 z-30 bg-[#F7F4EC]/95 backdrop-blur-sm border-b border-[#E3DFD3]/70 pt-safe px-2.5 sm:px-4 py-2 md:static md:bg-transparent md:backdrop-blur-none md:border-b-0 md:px-8 md:py-4 max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => {
            triggerHaptic(6);
            onNavigateToRegister();
          }}
          className="inline-flex items-center gap-1.5 sm:gap-2.5 min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#143B2B] rounded-xl pr-1 shrink-0 mr-auto"
        >
          <img
            src="/assets/zblal-logo.png"
            alt=""
            aria-hidden="true"
            width={1536}
            height={1024}
            className="h-6 w-auto sm:h-8 md:h-9 object-contain shrink-0 select-none"
          />
          <span className="font-display text-lg sm:text-2xl md:text-3xl font-bold tracking-tight text-[#143B2B]">
            {t.meta.brandName}
          </span>
        </button>

        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <LanguageSelector layoutGroupId="about-header" />
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              onNavigateToRegister();
            }}
            className="inline-flex items-center gap-1 sm:gap-1.5 min-h-[44px] px-2 sm:px-4 py-2 rounded-xl border border-[#143B2B]/20 bg-white hover:bg-[#143B2B] hover:text-white text-xs sm:text-sm font-semibold text-[#143B2B] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#143B2B]"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>{t.nav.register}</span>
          </button>
        </div>
      </header>

      {/* 1. Page Opening — The 3D Toilet in a Modern Bathroom Environment */}
      <section className="relative px-4 sm:px-8 pt-3 sm:pt-4 pb-6 sm:pb-8 max-w-4xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-[34px] border border-[#E3DFD3] bg-gradient-to-b from-[#FFFFFF] via-[#FBF9F4] to-[#F0ECE1] px-4 pt-6 pb-0 sm:px-10 sm:pt-12 shadow-[0_22px_54px_-28px_rgba(20,59,43,0.16)]">
          {/* Subtle Modern Bathroom Tile Grid Backdrop */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.45]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #E6E1D4 1px, transparent 1px), linear-gradient(to bottom, #E6E1D4 1px, transparent 1px)',
              backgroundSize: '44px 32px',
              maskImage: 'radial-gradient(ellipse at center, black 45%, transparent 88%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 45%, transparent 88%)',
            }}
          />

          <div className="relative z-10 flex flex-col items-center text-center">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-2xl sm:text-5xl font-bold tracking-tight text-[#143B2B] text-balance"
            >
              {t.about.title}
            </motion.h1>

            {/* Randomized Top Toilet Amharic Speech Bubble */}
            <div className="mt-4 sm:mt-5 -mb-3 relative z-20">
              <PoopSpeechBubble
                text={topPhrase}
                size="md"
                pointerDirection="down"
                delay={0.25}
                floatOffset={4}
              />
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="w-52 h-52 sm:w-80 sm:h-80"
            >
              <AboutToiletArt mood="sad" showLiquidOutflow />
            </motion.div>
          </div>
        </div>

        {/* Connector Stream Exiting Hero Into Story */}
        <div aria-hidden="true" className="flex justify-center -mt-1">
          <svg viewBox="0 0 80 64" className="w-16 h-12 overflow-visible">
            <path
              d="M28 0 C32 22 24 42 32 64 L48 64 C56 42 48 22 52 0 Z"
              fill="#7F502D"
            />
            <path
              d="M36 6 C38 26 35 44 37 58"
              fill="none"
              stroke="#B27A4E"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </section>

      {/* 2 & 3. Scroll-Connected Flowing Cartoon Stream + Revealed About Sections */}
      <div ref={storyRef} className="relative px-4 sm:px-8 max-w-4xl mx-auto">
        {/* Scroll-Driven Cartoon Brown Liquid Spine (Centered Seamlessly on Mobile and Desktop) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 flex justify-center overflow-hidden"
        >
          {/* Track */}
          <div className="w-3.5 h-full rounded-full bg-[#E5D8C3]/55" />
          {/* Flowing Animated Liquid Fill */}
          <motion.div
            style={{
              scaleY: prefersReducedMotion ? 1 : streamScaleY,
              transformOrigin: 'top',
            }}
            className="absolute top-0 w-4 h-full rounded-full bg-gradient-to-b from-[#8A562F] via-[#7B4B28] to-[#6B3F1F]"
          >
            {/* Subtle Liquid Gloss Line */}
            <div className="mx-auto mt-3 w-1 h-[96%] rounded-full bg-[#B57D52]/55" />
          </motion.div>
        </div>

        <div className="relative z-10 space-y-6 sm:space-y-10 pb-8 sm:pb-14">
          {/* Stream Bubble 1 */}
          <div className="flex justify-center md:pr-44 py-1">
            <MiniStreamPoop phrase={streamPhrases[0]} align="left" />
          </div>
          {/* Section A: Who We Are */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-12 items-center"
          >
            <div className="rounded-2xl md:rounded-3xl bg-white border border-[#E3DFD3] p-5 sm:p-8 shadow-[0_14px_36px_-22px_rgba(20,59,43,0.14)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#57635D]">
                {t.about.whoWeAre.kicker}
              </span>
              <h2 className="mt-1.5 sm:mt-2 font-display text-xl sm:text-3xl font-bold tracking-tight text-[#143B2B]">
                {t.about.whoWeAre.heading}
              </h2>
              <p className="mt-2.5 sm:mt-3 text-[15px] sm:text-base leading-relaxed text-[#34403A]">
                {t.about.whoWeAre.body}
              </p>
            </div>

            {/* Minimal Cartoon Illustration: Homes & Properties */}
            <div className="hidden md:flex items-center justify-center rounded-3xl bg-[#F2EFE6] border border-[#E3DFD3] p-8">
              <svg viewBox="0 0 220 140" className="w-52 h-36" aria-hidden="true">
                <rect x="24" y="64" width="52" height="54" rx="8" fill="#FFFFFF" stroke="#143B2B" strokeWidth="3.5" />
                <path d="M18 68 L50 38 L82 68 Z" fill="#CEF04E" stroke="#143B2B" strokeWidth="3.5" strokeLinejoin="round" />
                <rect x="42" y="88" width="16" height="30" rx="3" fill="#143B2B" />

                <rect x="90" y="34" width="54" height="84" rx="8" fill="#143B2B" stroke="#143B2B" strokeWidth="3.5" />
                <rect x="102" y="48" width="12" height="12" rx="2" fill="#CEF04E" />
                <rect x="120" y="48" width="12" height="12" rx="2" fill="#FFFFFF" />
                <rect x="102" y="68" width="12" height="12" rx="2" fill="#FFFFFF" />
                <rect x="120" y="68" width="12" height="12" rx="2" fill="#CEF04E" />
                <rect x="108" y="92" width="18" height="26" rx="3" fill="#FFFFFF" />

                <rect x="156" y="72" width="42" height="46" rx="8" fill="#FFFFFF" stroke="#143B2B" strokeWidth="3.5" />
                <rect x="166" y="84" width="22" height="14" rx="3" fill="#E5ECE8" stroke="#143B2B" strokeWidth="2.5" />
                <line x1="12" y1="118" x2="208" y2="118" stroke="#143B2B" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
            </div>
          </motion.article>

          {/* Stream Bubble 2 */}
          <div className="flex justify-center md:pl-44 py-1">
            <MiniStreamPoop phrase={streamPhrases[1]} align="right" />
          </div>

          {/* Section B: What We Do */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-12 items-center"
          >
            {/* Minimal Cartoon Illustration: POPO Service Truck */}
            <div className="hidden md:flex items-center justify-center rounded-3xl bg-[#143B2B] p-8 order-1">
              <svg viewBox="0 0 220 140" className="w-52 h-36" aria-hidden="true">
                {/* Vacuum Tank */}
                <rect x="24" y="42" width="108" height="52" rx="24" fill="#FFFFFF" stroke="#CEF04E" strokeWidth="3.5" />
                <rect x="44" y="56" width="68" height="24" rx="10" fill="#EEF4F0" />
                <text
                  x="78"
                  y="73"
                  textAnchor="middle"
                  fill="#143B2B"
                  fontSize={language === 'AM' ? '12' : '13'}
                  fontWeight="700"
                >
                  {t.meta.brandName}
                </text>
                {/* Truck Cab */}
                <path
                  d="M136 52 L172 52 L192 74 L192 94 L136 94 Z"
                  fill="#CEF04E"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                <path d="M144 60 L168 60 L180 74 L144 74 Z" fill="#143B2B" />
                {/* Chassis & Wheels */}
                <rect x="28" y="94" width="166" height="8" rx="4" fill="#A7F3D0" />
                <circle cx="56" cy="106" r="14" fill="#1B231F" stroke="#FFFFFF" strokeWidth="3" />
                <circle cx="56" cy="106" r="5" fill="#CEF04E" />
                <circle cx="164" cy="106" r="14" fill="#1B231F" stroke="#FFFFFF" strokeWidth="3" />
                <circle cx="164" cy="106" r="5" fill="#CEF04E" />
              </svg>
            </div>

            <div className="rounded-2xl md:rounded-3xl bg-white border border-[#E3DFD3] p-5 sm:p-8 shadow-[0_14px_36px_-22px_rgba(20,59,43,0.14)] md:order-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#57635D]">
                {t.about.whatWeDo.kicker}
              </span>
              <h2 className="mt-1.5 sm:mt-2 font-display text-xl sm:text-3xl font-bold tracking-tight text-[#143B2B]">
                {t.about.whatWeDo.heading}
              </h2>
              <p className="mt-2.5 sm:mt-3 text-[15px] sm:text-base leading-relaxed text-[#34403A]">
                {t.about.whatWeDo.body}
              </p>
            </div>
          </motion.article>

          {/* Stream Bubble 3 */}
          <div className="flex justify-center md:pr-44 py-1">
            <MiniStreamPoop phrase={streamPhrases[2]} align="left" />
          </div>

          {/* Section C: How Our Service Works */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="rounded-2xl md:rounded-3xl bg-white border border-[#E3DFD3] p-5 sm:p-8 shadow-[0_14px_36px_-22px_rgba(20,59,43,0.14)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#57635D]">
                {t.about.howItWorks.kicker}
              </span>
              <h2 className="mt-1.5 sm:mt-2 font-display text-xl sm:text-3xl font-bold tracking-tight text-[#143B2B]">
                {t.about.howItWorks.heading}
              </h2>

              <ol className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                {t.about.howItWorks.steps.map((step, index) => (
                  <li
                    key={index}
                    className="flex flex-row sm:flex-col items-start gap-3 rounded-2xl bg-[#F9F7F1] border border-[#E6E2D6] p-4"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#143B2B] text-[#CEF04E] font-display text-sm font-bold tabular-nums">
                      0{index + 1}
                    </span>
                    <p className="text-sm font-medium leading-snug text-[#2A352F]">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </motion.article>

          {/* Stream Bubble 4 */}
          <div className="flex justify-center md:pl-44 py-1">
            <MiniStreamPoop phrase={streamPhrases[3]} align="right" />
          </div>

          {/* Section D: Our Service Priorities */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="rounded-2xl md:rounded-3xl bg-white border border-[#E3DFD3] p-5 sm:p-8 shadow-[0_14px_36px_-22px_rgba(20,59,43,0.14)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#57635D]">
                {t.about.priorities.kicker}
              </span>
              <h2 className="mt-1.5 sm:mt-2 font-display text-xl sm:text-3xl font-bold tracking-tight text-[#143B2B]">
                {t.about.priorities.heading}
              </h2>

              <div className="mt-4 sm:mt-6 grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3.5">
                {SERVICE_TIERS.map((tier) => {
                  const Icon = getTierIcon(tier.code);
                  const localizedTier = t.tiers[tier.code];
                  const priceText = formatLocalizedTierPrice(
                    language,
                    tier.code,
                    tier.priceEtb,
                    tier.placeholderPriceLabel
                  );
                  const isExpress = tier.code === 'SUPER_FAST';
                  const isPremium = tier.code === 'PREMIUM';
                  return (
                    <div
                      key={tier.code}
                      className={`rounded-2xl border px-4 py-3.5 sm:p-5 flex flex-row items-center justify-between md:flex-col md:items-stretch md:justify-between gap-3 ${
                        isExpress
                          ? 'bg-[#F8FDE8] border-[#D5E49D]'
                          : isPremium
                          ? 'bg-[#143B2B] border-[#143B2B] text-white'
                          : 'bg-[#F9F7F1] border-[#E3DFD3]'
                      }`}
                    >
                      <div className="flex items-center gap-3 md:block">
                        <span
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                            isExpress
                              ? 'bg-[#CEF04E] text-[#143B2B]'
                              : isPremium
                              ? 'bg-[#CEF04E] text-[#143B2B]'
                              : 'bg-[#143B2B]/10 text-[#143B2B]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="md:mt-4">
                          <div
                            className={`font-display text-[15px] sm:text-base font-bold tracking-tight ${
                              isPremium ? 'text-white' : 'text-[#143B2B]'
                            }`}
                          >
                            {localizedTier.label}
                          </div>
                          <div
                            className={`text-xs sm:text-sm font-medium ${
                              isPremium ? 'text-[#D6E6DD]' : 'text-[#57635D]'
                            }`}
                          >
                            {localizedTier.timeframe}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`md:mt-4 md:pt-3 md:border-t font-display text-base sm:text-lg font-bold tabular-nums whitespace-nowrap ${
                          isPremium
                            ? 'md:border-white/15 text-[#CEF04E]'
                            : 'md:border-[#E3DFD3] text-[#143B2B]'
                        }`}
                      >
                        {priceText}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.article>

          {/* Stream Bubble 5 */}
          <div className="flex justify-center md:pr-44 py-1">
            <MiniStreamPoop phrase={streamPhrases[4]} align="left" />
          </div>
        </div>
      </div>

      {/* 4 & 5. The Big Cleanup — Final Interactive Scene */}
      <div className="px-4 sm:px-8 pb-8 sm:pb-16 pb-safe max-w-4xl mx-auto">
        <BigCleanupFinale onRegisterNow={onNavigateToRegister} />
      </div>
    </div>
  );
}
