import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import {
  formatLocalizedEtbPrice,
  formatTimeframeFromHours,
  getLocalizedLocationName,
  getLocalizedPriorityName,
  getLocalizedSubcityName,
} from '../services/supabasePricing.ts';
import { triggerHaptic } from '../utils/haptics.ts';
import { LanguageSelector } from './LanguageSelector.tsx';
import type { ConfirmedRegistration } from './RegistrationForm.tsx';

interface ConfirmationScreenProps {
  registration: ConfirmedRegistration;
  onReset: () => void;
}

export function ConfirmationScreen({
  registration,
  onReset,
}: ConfirmationScreenProps) {
  const { language, t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const localizedSubcity = getLocalizedSubcityName(
    {
      nameEn: registration.subcity,
      nameAm: registration.subcityNameAm ?? null,
      nameOro: null,
      nameTig: null,
    },
    language
  );

  const localizedLocation = getLocalizedLocationName(
    {
      nameEn: registration.specificLocation,
      nameAm: registration.locationNameAm ?? null,
      nameOro: null,
      nameTig: null,
    },
    language
  );

  const localizedPriority = getLocalizedPriorityName(
    {
      code: registration.servicePriorityCode ?? registration.servicePriority,
      nameEn: registration.servicePriorityNameEn ?? registration.servicePriority,
      nameAm: registration.servicePriorityNameAm ?? null,
    },
    language,
    t.tiers
  );

  const localizedTimeframe = formatTimeframeFromHours(
    registration.minHours,
    registration.maxHours,
    language,
    registration.estimatedTimeframe
  );

  const localizedPrice =
    typeof registration.servicePriceEtb === 'number' &&
    Number.isFinite(registration.servicePriceEtb)
      ? formatLocalizedEtbPrice(
          registration.servicePriceEtb,
          language,
          registration.servicePrice
        )
      : registration.servicePrice;

  const handleCopyRef = async () => {
    triggerHaptic(8);
    try {
      await navigator.clipboard.writeText(registration.referenceNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback not needed
    }
  };

  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 min-h-[100dvh] w-full flex flex-col md:items-center md:justify-center md:px-6 md:py-12"
    >
      {/* Subtle Zblal Wordmark + Language Selector */}
      <div className="sticky top-0 z-30 bg-[#F7F4EC]/95 backdrop-blur-sm pt-safe px-2.5 sm:px-4 py-2 md:static md:bg-transparent md:backdrop-blur-none md:p-0 md:mb-8 md:relative w-full md:max-w-xl flex items-center justify-between md:justify-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 mr-auto md:mr-0">
          <img
            src="/assets/zblal-logo.png"
            alt=""
            aria-hidden="true"
            width={1536}
            height={1024}
            className="h-6 w-auto sm:h-8 md:h-10 object-contain shrink-0 select-none"
          />
          <span className="font-display text-lg sm:text-2xl md:text-4xl font-bold tracking-tight text-[#143B2B]">
            {t.meta.brandName}
          </span>
        </div>

        <div className="md:hidden shrink-0">
          <LanguageSelector layoutGroupId="confirm-mobile" />
        </div>

        <div className="hidden md:block md:absolute md:right-0">
          <LanguageSelector layoutGroupId="confirm-desktop" />
        </div>
      </div>

      <section
        aria-label={t.confirmation.heading}
        className="flex-1 md:flex-initial w-full md:max-w-xl rounded-t-[24px] md:rounded-3xl bg-white border-t md:border border-[#E3DFD3] px-4 pt-6 pb-8 pb-safe md:p-8 lg:p-10 md:shadow-[0_20px_50px_-24px_rgba(20,59,43,0.14)] flex flex-col justify-between"
      >
        <div>
          {/* Success Animation Seal */}
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 18,
                delay: 0.05,
              }}
              className="relative flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-[#143B2B] text-[#CEF04E] shadow-[0_12px_24px_-10px_rgba(20,59,43,0.45)]"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.25 }}
              >
                <Check className="w-7 h-7 md:w-8 md:h-8 stroke-[3]" />
              </motion.div>
            </motion.div>

            <h1 className="mt-4 md:mt-5 font-display text-2xl md:text-3xl font-bold tracking-tight text-[#143B2B]">
              {t.confirmation.heading}
            </h1>

            {/* Reference Number */}
            <div className="mt-3.5 md:mt-4 flex items-center gap-2 rounded-xl bg-[#F4F2EA] border border-[#E3DFD3] px-4 py-2">
              <span className="text-xs font-medium text-[#57635D]">
                {t.confirmation.refLabel}
              </span>
              <span className="font-mono text-base sm:text-lg font-semibold text-[#143B2B] tabular-nums">
                {registration.referenceNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyRef}
                aria-label={t.confirmation.copyAriaLabel}
                className="ml-1 inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-[#57635D] hover:text-[#143B2B] hover:bg-white transition-colors cursor-pointer"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-[#143B2B]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Summary Rows */}
          <dl className="mt-6 md:mt-7 divide-y divide-[#ECE8DC] border-t border-b border-[#ECE8DC]">
            <div className="py-3.5 flex items-baseline justify-between gap-4">
              <dt className="text-sm text-[#57635D] shrink-0">
                {t.confirmation.customerName}
              </dt>
              <dd className="text-sm sm:text-base font-semibold text-[#1B231F] text-right">
                {registration.customerName}
              </dd>
            </div>

            <div className="py-3.5 flex items-baseline justify-between gap-4">
              <dt className="text-sm text-[#57635D] shrink-0">
                {t.confirmation.phoneNumber}
              </dt>
              <dd className="text-sm sm:text-base font-semibold text-[#1B231F] tabular-nums text-right">
                {registration.phoneNumber}
              </dd>
            </div>

            <div className="py-3.5 flex items-baseline justify-between gap-4">
              <dt className="text-sm text-[#57635D] shrink-0">
                {t.confirmation.location}
              </dt>
              <dd className="text-sm sm:text-base font-semibold text-[#1B231F] text-right">
                {localizedSubcity} · {localizedLocation}
              </dd>
            </div>

            <div className="py-3.5 flex items-baseline justify-between gap-4">
              <dt className="text-sm text-[#57635D] shrink-0">
                {t.confirmation.servicePriority}
              </dt>
              <dd className="text-sm sm:text-base font-bold text-[#143B2B] text-right">
                {localizedPriority}
              </dd>
            </div>

            <div className="py-3.5 flex items-baseline justify-between gap-4">
              <dt className="text-sm text-[#57635D] shrink-0">
                {t.confirmation.servicePrice}
              </dt>
              <dd className="text-sm sm:text-base font-bold text-[#143B2B] tabular-nums text-right">
                {localizedPrice}
              </dd>
            </div>

            <div className="py-3.5 flex items-baseline justify-between gap-4">
              <dt className="text-sm text-[#57635D] shrink-0">
                {t.confirmation.expectedTimeframe}
              </dt>
              <dd className="text-sm sm:text-base font-semibold text-[#1B231F] text-right">
                {localizedTimeframe}
              </dd>
            </div>
          </dl>
        </div>

        {/* Return Action */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          transition={{ duration: 0.12 }}
          onClick={() => {
            triggerHaptic(8);
            onReset();
          }}
          className="mt-6 md:mt-7 w-full min-h-[54px] md:min-h-[52px] rounded-xl md:rounded-2xl bg-[#143B2B] hover:bg-[#0E2B1F] text-white font-display text-base font-semibold transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#143B2B] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.confirmation.backButton}</span>
        </motion.button>
      </section>
    </motion.main>
  );
}
