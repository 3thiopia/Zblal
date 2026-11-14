import { motion } from 'motion/react';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import type { LanguageCode } from '../i18n/locationTranslations.ts';
import { triggerHaptic } from '../utils/haptics.ts';

const LANGUAGES: { code: LanguageCode; label: string; ariaLabel: string }[] = [
  { code: 'AM', label: 'AM', ariaLabel: 'Amharic (አማርኛ)' },
  { code: 'ENG', label: 'ENG', ariaLabel: 'English' },
  { code: 'ORO', label: 'ORO', ariaLabel: 'Afaan Oromo' },
  { code: 'TIG', label: 'TIG', ariaLabel: 'Tigrinya (ትግርኛ)' },
];

interface LanguageSelectorProps {
  layoutGroupId?: string;
}

export function LanguageSelector({ layoutGroupId = 'header-lang' }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <nav
      aria-label="Language selector"
      className="flex items-center gap-0.5 sm:gap-1.5 shrink-0"
    >
      {LANGUAGES.map((item) => {
        const isActive = language === item.code;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => {
              if (!isActive) {
                triggerHaptic(6);
                setLanguage(item.code);
              }
            }}
            aria-label={item.ariaLabel}
            aria-pressed={isActive}
            className={`relative min-h-[44px] px-1 sm:px-2 flex flex-col items-center justify-center text-[11px] sm:text-xs tracking-wide transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#143B2B] rounded-lg ${
              isActive
                ? 'font-bold text-[#143B2B]'
                : 'font-medium text-[#6C7771] hover:text-[#143B2B]'
            }`}
          >
            <span>{item.label}</span>
            {isActive && (
              <motion.span
                layoutId={`lang-dash-${layoutGroupId}`}
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                className="mt-0.5 h-[2.5px] w-4 rounded-full bg-[#143B2B]"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
