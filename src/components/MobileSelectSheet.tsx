import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Search, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import { triggerHaptic } from '../utils/haptics.ts';

export interface SelectOption {
  value: string;
  label: string;
}

interface MobileSelectSheetProps {
  isOpen: boolean;
  title: string;
  options: SelectOption[];
  selectedValue: string;
  searchPlaceholder?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function MobileSelectSheet({
  isOpen,
  title,
  options,
  selectedValue,
  searchPlaceholder = 'Search...',
  onSelect,
  onClose,
}: MobileSelectSheetProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showSearch = options.length >= 6;

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(trimmed) ||
        opt.value.toLowerCase().includes(trimmed)
    );
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
          />

          {/* Bottom Sheet Surface */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34, mass: 0.9 }}
            className="relative z-10 flex max-h-[85dvh] w-full flex-col rounded-t-[26px] bg-white shadow-[0_-16px_40px_rgba(20,59,43,0.18)]"
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-[#D5D0C3]" />
            </div>

            {/* Sheet Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-[#ECE8DC]">
              <h2 className="font-display text-lg font-bold text-[#143B2B]">
                {title}
              </h2>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(6);
                  onClose();
                }}
                aria-label={t.form.closeSelector}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#57635D] hover:bg-[#F4F2EA] active:bg-[#EAE6DA] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar for Long Lists */}
            {showSearch && (
              <div className="px-4 pt-3 pb-2">
                <div className="relative flex items-center">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 w-4 h-4 text-[#7D8781]"
                  />
                  <input
                    ref={searchInputRef}
                    type="search"
                    enterKeyHint="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full min-h-[46px] rounded-xl border border-[#DFDBD0] bg-[#F7F5EE] pl-10 pr-10 text-base text-[#1B231F] placeholder:text-[#8A948E] focus:border-[#143B2B] focus:bg-white focus:outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label={t.form.clearSearch}
                      className="absolute right-1 inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-[#57635D] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Touch-Friendly Options List */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 pb-safe">
              {filteredOptions.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#6B756F]">
                  {t.form.noMatchingLocations}
                </div>
              ) : (
                <ul role="listbox" aria-label={title} className="space-y-1">
                  {filteredOptions.map((option) => {
                    const isSelected = option.value === selectedValue;
                    return (
                      <li key={option.value}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            triggerHaptic(10);
                            onSelect(option.value);
                            onClose();
                          }}
                          className={`w-full min-h-[52px] rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#EEF4F0] text-[#143B2B] font-semibold'
                              : 'text-[#1B231F] hover:bg-[#F7F5EE] active:bg-[#EFECE3] font-medium'
                          }`}
                        >
                          <span className="text-[16px] leading-snug">{option.label}</span>
                          {isSelected && (
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#143B2B] text-[#CEF04E]">
                              <Check className="w-3.5 h-3.5 stroke-[2.75]" />
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
