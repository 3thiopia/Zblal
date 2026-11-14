import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Loader2,
  Timer,
  Truck,
  Zap,
} from 'lucide-react';
import { ADDIS_ABABA_SUBCITIES, getLocationsForSubcity } from '../config/locations.ts';
import {
  SERVICE_TIERS,
  type ServicePriorityCode,
} from '../config/popoConfig.ts';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import { localizeLocation, localizeSubcity } from '../i18n/locationTranslations.ts';
import { formatLocalizedTierPrice } from '../i18n/translations.ts';
import { triggerHaptic } from '../utils/haptics.ts';
import {
  formatEthiopianDisplayPhone,
  isValidEthiopianLocalDigits,
  normalizeEthiopianLocalDigits,
} from '../utils/phone.ts';
import { BackgroundTankerScene } from './BackgroundTankerScene.tsx';
import { LanguageSelector } from './LanguageSelector.tsx';
import { MobileSelectSheet, type SelectOption } from './MobileSelectSheet.tsx';

export interface ConfirmedRegistration {
  referenceNumber: string;
  customerName: string;
  phoneNumber: string;
  subcity: string;
  specificLocation: string;
  servicePriority: string;
  servicePrice: string;
  estimatedTimeframe: string;
  status: string;
  createdAt: string;
}

interface RegistrationFormProps {
  onSuccess: (registration: ConfirmedRegistration) => void;
  onOpenAbout?: () => void;
}

interface FieldErrors {
  customerName?: boolean;
  phoneNumber?: boolean;
  subcity?: boolean;
  specificLocation?: boolean;
  servicePriority?: boolean;
}

type SubmitErrorState =
  | { kind: 'api'; raw?: string }
  | { kind: 'network' }
  | null;

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `popo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function scrollFieldIntoViewOnMobile(el: HTMLElement | null) {
  if (!el || typeof window === 'undefined' || window.innerWidth >= 768) return;
  window.setTimeout(() => {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 160);
}

export function RegistrationForm({ onSuccess, onOpenAbout }: RegistrationFormProps) {
  const { language, t } = useLanguage();
  const [customerName, setCustomerName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [subcity, setSubcity] = useState('');
  const [specificLocation, setSpecificLocation] = useState('');
  const [servicePriority, setServicePriority] = useState<ServicePriorityCode | ''>('');
  const [idempotencyKey] = useState<string>(() => createIdempotencyKey());

  const [activeSheet, setActiveSheet] = useState<'subcity' | 'location' | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<SubmitErrorState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phoneInputRef = useRef<HTMLInputElement>(null);

  const subcityOptions = useMemo<SelectOption[]>(
    () =>
      ADDIS_ABABA_SUBCITIES.map((item) => ({
        value: item.name,
        label: localizeSubcity(item.name, language),
      })),
    [language]
  );

  const availableLocations = useMemo(() => {
    return subcity ? getLocationsForSubcity(subcity) : [];
  }, [subcity]);

  const locationOptions = useMemo<SelectOption[]>(
    () =>
      availableLocations.map((loc) => ({
        value: loc,
        label: localizeLocation(loc, language),
      })),
    [availableLocations, language]
  );

  const localizedSelectedSubcity = subcity
    ? localizeSubcity(subcity, language)
    : '';
  const localizedSelectedLocation = specificLocation
    ? localizeLocation(specificLocation, language)
    : '';

  const handlePhoneChange = (rawValue: string) => {
    const normalized = normalizeEthiopianLocalDigits(rawValue);
    setPhoneDigits(normalized);
    if (errors.phoneNumber) {
      setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
    }
  };

  const handleSubcityChange = (nextSubcity: string) => {
    setSubcity(nextSubcity);
    setSpecificLocation('');
    setErrors((prev) => ({
      ...prev,
      subcity: undefined,
      specificLocation: undefined,
    }));
  };

  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customerName.trim().length >= 2) {
      e.preventDefault();
      phoneInputRef.current?.focus();
    }
  };

  const handlePhoneKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isValidEthiopianLocalDigits(phoneDigits)) {
      e.preventDefault();
      phoneInputRef.current?.blur();
    }
  };

  const validateAll = (): boolean => {
    const nextErrors: FieldErrors = {};

    if (customerName.trim().length < 2) {
      nextErrors.customerName = true;
    }

    if (!isValidEthiopianLocalDigits(phoneDigits)) {
      nextErrors.phoneNumber = true;
    }

    if (!subcity) {
      nextErrors.subcity = true;
    }

    if (!specificLocation) {
      nextErrors.specificLocation = true;
    }

    if (!servicePriority) {
      nextErrors.servicePriority = true;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    triggerHaptic(12);
    setSubmitError(null);
    if (!validateAll()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          phoneNumber: phoneDigits,
          subcity,
          specificLocation,
          servicePriority,
          idempotencyKey,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setSubmitError({ kind: 'api', raw: payload?.error });
        setIsSubmitting(false);
        return;
      }

      onSuccess(payload.registration);
    } catch {
      setSubmitError({ kind: 'network' });
      setIsSubmitting(false);
    }
  };

  const submitErrorText =
    submitError?.kind === 'network'
      ? t.form.errors.networkError
      : submitError?.kind === 'api'
      ? language === 'ENG' && submitError.raw
        ? submitError.raw
        : t.form.errors.genericSubmit
      : null;

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
    <motion.main
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 min-h-[100dvh] w-full flex flex-col md:items-center md:justify-center md:px-6 md:py-12"
    >
      {/* Subtle POPO Wordmark — Compact Sticky Native App Header on Mobile, Centered Desktop Wordmark */}
      <div className="sticky top-0 z-30 bg-[#F7F4EC]/95 backdrop-blur-sm pt-safe px-3 sm:px-4 py-2 md:static md:bg-transparent md:backdrop-blur-none md:p-0 md:mb-8 md:relative w-full md:max-w-2xl flex items-center justify-between md:justify-center gap-1.5 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <img
            src="/assets/zblal-logo.png"
            alt=""
            aria-hidden="true"
            width={1536}
            height={1024}
            className="h-7 w-auto sm:h-8 md:h-10 object-contain shrink-0 select-none"
          />
          <h1 className="font-display text-xl sm:text-2xl md:text-4xl font-bold tracking-tight text-[#143B2B]">
            {t.meta.brandName}
          </h1>
        </div>

        <div className="md:hidden flex items-center gap-1 shrink-0">
          <LanguageSelector layoutGroupId="reg-mobile" />
          {onOpenAbout && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(6);
                onOpenAbout();
              }}
              className="min-h-[44px] px-2.5 py-2 rounded-xl text-[13px] font-semibold text-[#143B2B]/85 hover:text-[#143B2B] hover:bg-white/70 active:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#143B2B]"
            >
              {t.nav.about}
            </button>
          )}
        </div>

        <div className="hidden md:block md:absolute md:left-0">
          <LanguageSelector layoutGroupId="reg-desktop" />
        </div>

        {onOpenAbout && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(6);
              onOpenAbout();
            }}
            className="hidden md:inline-flex items-center md:absolute md:right-0 min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-semibold text-[#143B2B]/85 hover:text-[#143B2B] hover:bg-white/70 active:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#143B2B]"
          >
            {t.nav.about}
          </button>
        )}
      </div>

      {/* Full-Scene Background Illustration: Upper-Left Toilet -> Long Winding Hose -> Bottom-Right Blue Ethiopian Tanker */}
      <BackgroundTankerScene
        variant="desktop"
        className="hidden md:block fixed inset-0 z-0 overflow-hidden opacity-[0.34]"
      />

      {/* Registration Surface — Full-Screen App Sheet on Mobile, Centered Card on Tablet/Desktop */}
      <section
        aria-label="Customer Registration"
        className="relative z-10 flex-1 md:flex-initial w-full md:max-w-2xl rounded-t-[24px] md:rounded-3xl bg-white border-t md:border border-[#E3DFD3] px-4 pt-5 pb-8 pb-safe md:p-8 lg:p-10 md:shadow-[0_20px_50px_-24px_rgba(20,59,43,0.14)] flex flex-col justify-between"
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4 md:space-y-6">
          {/* Customer Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 md:gap-5">
            {/* 1. Customer Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="customerName"
                className="block text-[13px] md:text-sm font-semibold text-[#1B231F]"
              >
                {t.form.customerNameLabel}
              </label>
              <input
                id="customerName"
                name="customerName"
                type="text"
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                value={customerName}
                onFocus={(e) => scrollFieldIntoViewOnMobile(e.currentTarget)}
                onKeyDown={handleNameKeyDown}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (errors.customerName) {
                    setErrors((prev) => ({ ...prev, customerName: undefined }));
                  }
                }}
                placeholder={t.form.customerNamePlaceholder}
                aria-invalid={Boolean(errors.customerName)}
                className={`w-full min-h-[52px] md:min-h-[48px] rounded-[14px] md:rounded-xl border bg-[#F7F5EE] md:bg-[#FCFBF8] px-3.5 md:px-4 py-2.5 text-base text-[#1B231F] placeholder:text-[#8A948E] transition-all focus:outline-none focus:bg-white ${
                  errors.customerName
                    ? 'border-[#B42318] focus:ring-2 focus:ring-[#B42318]/20'
                    : 'border-[#DDD8CA] md:border-[#D9D4C7] focus:border-[#143B2B] focus:ring-2 focus:ring-[#143B2B]/15'
                }`}
              />
              {errors.customerName && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#B42318] pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.form.errors.customerName}</span>
                </p>
              )}
            </div>

            {/* 2. Phone Number (+251) */}
            <div className="space-y-1.5">
              <label
                htmlFor="phoneNumber"
                className="block text-[13px] md:text-sm font-semibold text-[#1B231F]"
              >
                {t.form.phoneLabel}
              </label>
              <div
                className={`flex items-stretch min-h-[52px] md:min-h-[48px] rounded-[14px] md:rounded-xl border bg-[#F7F5EE] md:bg-[#FCFBF8] overflow-hidden transition-all focus-within:bg-white ${
                  errors.phoneNumber
                    ? 'border-[#B42318] focus-within:ring-2 focus-within:ring-[#B42318]/20'
                    : 'border-[#DDD8CA] md:border-[#D9D4C7] focus-within:border-[#143B2B] focus-within:ring-2 focus-within:ring-[#143B2B]/15'
                }`}
              >
                <span className="inline-flex items-center px-3.5 bg-[#EFECE2] md:bg-[#F1EEE5] border-r border-[#DDD8CA] md:border-[#D9D4C7] text-sm font-semibold text-[#143B2B] tabular-nums select-none shrink-0">
                  +251
                </span>
                <input
                  ref={phoneInputRef}
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  enterKeyHint="done"
                  value={formatEthiopianDisplayPhone(phoneDigits)}
                  onFocus={(e) => scrollFieldIntoViewOnMobile(e.currentTarget)}
                  onKeyDown={handlePhoneKeyDown}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder={t.form.phonePlaceholder}
                  aria-invalid={Boolean(errors.phoneNumber)}
                  className="w-full bg-transparent px-3.5 py-2.5 text-base text-[#1B231F] tabular-nums placeholder:text-[#8A948E] focus:outline-none"
                />
              </div>
              {errors.phoneNumber && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#B42318] pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.form.errors.phoneNumber}</span>
                </p>
              )}
            </div>

            {/* 3. Subcity */}
            <div className="space-y-1.5">
              <label
                htmlFor="subcity"
                className="block text-[13px] md:text-sm font-semibold text-[#1B231F]"
              >
                {t.form.subcityLabel}
              </label>

              {/* Mobile Native Bottom-Sheet Trigger */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(6);
                  setActiveSheet('subcity');
                }}
                aria-haspopup="listbox"
                aria-expanded={activeSheet === 'subcity'}
                className={`md:hidden w-full min-h-[52px] rounded-[14px] border bg-[#F7F5EE] px-3.5 py-2.5 flex items-center justify-between gap-2 text-left text-base transition-colors active:bg-[#EFECE3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#143B2B] ${
                  subcity ? 'text-[#1B231F] font-medium' : 'text-[#8A948E]'
                } ${
                  errors.subcity ? 'border-[#B42318]' : 'border-[#DDD8CA]'
                }`}
              >
                <span className="truncate">
                  {localizedSelectedSubcity || t.form.subcityPlaceholder}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 text-[#57635D]" />
              </button>

              {/* Tablet/Desktop Select */}
              <div className="hidden md:block relative">
                <select
                  id="subcity"
                  name="subcity"
                  value={subcity}
                  onChange={(e) => handleSubcityChange(e.target.value)}
                  aria-invalid={Boolean(errors.subcity)}
                  className={`w-full min-h-[48px] appearance-none rounded-xl border bg-[#FCFBF8] pl-4 pr-10 py-2.5 text-base transition-colors focus:outline-none focus:bg-white cursor-pointer ${
                    subcity ? 'text-[#1B231F]' : 'text-[#8A948E]'
                  } ${
                    errors.subcity
                      ? 'border-[#B42318] focus:ring-2 focus:ring-[#B42318]/20'
                      : 'border-[#D9D4C7] focus:border-[#143B2B] focus:ring-2 focus:ring-[#143B2B]/15'
                  }`}
                >
                  <option value="" disabled>
                    {t.form.subcityPlaceholder}
                  </option>
                  {ADDIS_ABABA_SUBCITIES.map((item) => (
                    <option key={item.id} value={item.name} className="text-[#1B231F]">
                      {localizeSubcity(item.name, language)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#57635D]"
                />
              </div>

              {errors.subcity && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#B42318] pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.form.errors.subcity}</span>
                </p>
              )}
            </div>

            {/* 4. Specific Location */}
            <div className="space-y-1.5">
              <label
                htmlFor="specificLocation"
                className="block text-[13px] md:text-sm font-semibold text-[#1B231F]"
              >
                {t.form.locationLabel}
              </label>

              {/* Mobile Native Bottom-Sheet Trigger */}
              <button
                type="button"
                disabled={!subcity}
                onClick={() => {
                  if (!subcity) return;
                  triggerHaptic(6);
                  setActiveSheet('location');
                }}
                aria-haspopup="listbox"
                aria-expanded={activeSheet === 'location'}
                className={`md:hidden w-full min-h-[52px] rounded-[14px] border px-3.5 py-2.5 flex items-center justify-between gap-2 text-left text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#143B2B] ${
                  !subcity
                    ? 'bg-[#EFECE4] border-[#E3DFD3] text-[#8A948E] cursor-not-allowed'
                    : specificLocation
                    ? 'bg-[#F7F5EE] border-[#DDD8CA] text-[#1B231F] font-medium active:bg-[#EFECE3]'
                    : 'bg-[#F7F5EE] border-[#DDD8CA] text-[#8A948E] active:bg-[#EFECE3]'
                } ${errors.specificLocation && subcity ? 'border-[#B42318]' : ''}`}
              >
                <span className="truncate">
                  {subcity
                    ? localizedSelectedLocation || t.form.locationPlaceholder
                    : t.form.locationDisabledPlaceholder}
                </span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 ${
                    subcity ? 'text-[#57635D]' : 'text-[#A8B0AB]'
                  }`}
                />
              </button>

              {/* Tablet/Desktop Select */}
              <div className="hidden md:block relative">
                <select
                  id="specificLocation"
                  name="specificLocation"
                  value={specificLocation}
                  disabled={!subcity}
                  onChange={(e) => {
                    setSpecificLocation(e.target.value);
                    if (errors.specificLocation) {
                      setErrors((prev) => ({ ...prev, specificLocation: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(errors.specificLocation)}
                  className={`w-full min-h-[48px] appearance-none rounded-xl border pl-4 pr-10 py-2.5 text-base transition-colors focus:outline-none ${
                    !subcity
                      ? 'bg-[#F2EFE7] border-[#E3DFD3] text-[#8A948E] cursor-not-allowed'
                      : specificLocation
                      ? 'bg-[#FCFBF8] text-[#1B231F] focus:bg-white cursor-pointer'
                      : 'bg-[#FCFBF8] text-[#8A948E] focus:bg-white cursor-pointer'
                  } ${
                    errors.specificLocation
                      ? 'border-[#B42318] focus:ring-2 focus:ring-[#B42318]/20'
                      : subcity
                      ? 'border-[#D9D4C7] focus:border-[#143B2B] focus:ring-2 focus:ring-[#143B2B]/15'
                      : ''
                  }`}
                >
                  <option value="" disabled>
                    {subcity
                      ? t.form.locationPlaceholder
                      : t.form.locationDisabledPlaceholder}
                  </option>
                  {availableLocations.map((loc) => (
                    <option key={loc} value={loc} className="text-[#1B231F]">
                      {localizeLocation(loc, language)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    subcity ? 'text-[#57635D]' : 'text-[#A8B0AB]'
                  }`}
                />
              </div>

              {errors.specificLocation && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#B42318] pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.form.errors.specificLocation}</span>
                </p>
              )}
            </div>
          </div>

          {/* Hairline Divider */}
          <div className="border-t border-[#ECE8DC]" />

          {/* 5. Service Priority Selection */}
          <div className="space-y-2.5 md:space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="block text-[13px] md:text-sm font-semibold text-[#1B231F]">
                {t.form.servicePriorityLabel}
              </span>
              {errors.servicePriority && (
                <span className="flex items-center gap-1 text-xs font-medium text-[#B42318]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.form.errors.servicePriority}</span>
                </span>
              )}
            </div>

            <div
              role="radiogroup"
              aria-label={t.form.servicePriorityLabel}
              className="flex flex-col gap-2.5 md:grid md:grid-cols-3 md:gap-3.5"
            >
              {SERVICE_TIERS.map((tier) => {
                const isSelected = servicePriority === tier.code;
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
                  <motion.button
                    key={tier.code}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      triggerHaptic(10);
                      setServicePriority(tier.code);
                      if (errors.servicePriority) {
                        setErrors((prev) => ({
                          ...prev,
                          servicePriority: undefined,
                        }));
                      }
                    }}
                    animate={{
                      scale: isSelected ? 1.015 : 1,
                    }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    className={`relative flex flex-row items-center justify-between md:flex-col md:items-stretch md:justify-between text-left rounded-2xl px-4 py-3.5 md:p-5 min-h-[76px] md:min-h-[148px] border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#143B2B] ${
                      isSelected
                        ? isExpress
                          ? 'bg-[#F5FBE0] border-2 border-[#143B2B] shadow-[0_8px_20px_-12px_rgba(20,59,43,0.28)]'
                          : isPremium
                          ? 'bg-[#143B2B] border-2 border-[#143B2B] text-white shadow-[0_8px_20px_-12px_rgba(20,59,43,0.35)]'
                          : 'bg-[#EEF4F0] border-2 border-[#143B2B] shadow-[0_8px_20px_-12px_rgba(20,59,43,0.22)]'
                        : isExpress
                        ? 'bg-[#FCFDF6] border-[#DCE4BA] hover:border-[#143B2B]/60'
                        : isPremium
                        ? 'bg-[#F9FBF9] border-[#D6DFD8] hover:border-[#143B2B]/60'
                        : 'bg-[#FCFBF8] border-[#E3DFD3] hover:border-[#143B2B]/50'
                    }`}
                  >
                    {/* Mobile Left / Desktop Top+Middle */}
                    <div className="flex items-center gap-3 md:block">
                      {/* Desktop Top Row: Icon & Selection Circle */}
                      <div className="flex items-center justify-between gap-2 md:w-full">
                        <span
                          className={`inline-flex h-10 w-10 md:h-9 md:w-9 items-center justify-center rounded-xl transition-colors shrink-0 ${
                            isSelected
                              ? isExpress
                                ? 'bg-[#CEF04E] text-[#112E22]'
                                : isPremium
                                ? 'bg-[#CEF04E] text-[#112E22]'
                                : 'bg-[#143B2B] text-white'
                              : isExpress
                              ? 'bg-[#CEF04E]/55 text-[#143B2B]'
                              : isPremium
                              ? 'bg-[#143B2B]/10 text-[#143B2B]'
                              : 'bg-[#EFECE3] text-[#35453D]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>

                        <span
                          className={`hidden md:inline-flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                            isSelected
                              ? isPremium
                                ? 'bg-[#CEF04E] border-[#CEF04E] text-[#112E22]'
                                : 'bg-[#143B2B] border-[#143B2B] text-white'
                              : 'border-[#CFC9B9] bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.75]" />}
                        </span>
                      </div>

                      {/* Tier Title & Timeframe */}
                      <div className="md:mt-4">
                        <div
                          className={`font-display text-[15px] md:text-base font-bold tracking-tight ${
                            isSelected && isPremium ? 'text-white' : 'text-[#143B2B]'
                          }`}
                        >
                          {localizedTier.label}
                        </div>
                        <div
                          className={`mt-0.5 text-xs md:text-sm font-medium ${
                            isSelected && isPremium
                              ? 'text-[#D6E6DD]'
                              : 'text-[#57635D]'
                          }`}
                        >
                          {localizedTier.timeframe}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Right / Desktop Bottom: Price + Mobile Selection Indicator */}
                    <div
                      className={`flex items-center gap-2.5 md:block md:mt-4 md:pt-3 md:border-t ${
                        isSelected && isPremium
                          ? 'md:border-white/15'
                          : 'md:border-[#E6E2D6]'
                      }`}
                    >
                      <span
                        className={`font-display text-base md:text-lg font-bold tabular-nums tracking-tight whitespace-nowrap ${
                          isSelected && isPremium
                            ? 'text-[#CEF04E]'
                            : 'text-[#143B2B]'
                        }`}
                      >
                        {priceText}
                      </span>

                      <span
                        className={`md:hidden inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isSelected
                            ? isPremium
                              ? 'bg-[#CEF04E] border-[#CEF04E] text-[#112E22]'
                              : 'bg-[#143B2B] border-[#143B2B] text-white'
                            : 'border-[#CFC9B9] bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.75]" />}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Server Error Feedback */}
          {submitErrorText && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-[#F3C6C2] bg-[#FEF3F2] px-4 py-3 text-sm font-medium text-[#B42318]"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{submitErrorText}</span>
            </div>
          )}

          {/* 6. Prominent REGISTER Button */}
          <div className="pt-1">
            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileTap={isSubmitting ? undefined : { scale: 0.985 }}
              transition={{ duration: 0.12 }}
              className="w-full min-h-[54px] rounded-xl md:rounded-2xl bg-[#143B2B] hover:bg-[#0E2B1F] disabled:opacity-75 disabled:cursor-not-allowed text-white font-display text-base font-bold tracking-wider transition-colors flex items-center justify-center gap-2.5 shadow-[0_10px_24px_-10px_rgba(20,59,43,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#143B2B] cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t.form.submittingButton}</span>
                </>
              ) : (
                <span>{t.form.submitButton}</span>
              )}
            </motion.button>
          </div>
        </form>

        {/* Mobile Toilet -> Winding Hose -> Blue Tanker Composition (Below Form, Never Overlapping Controls) */}
        <div className="md:hidden mt-4 pt-1 pointer-events-none select-none">
          <BackgroundTankerScene variant="mobile" className="w-full opacity-[0.28]" />
        </div>
      </section>

      {/* Mobile Native Bottom-Sheet Selectors */}
      <MobileSelectSheet
        isOpen={activeSheet === 'subcity'}
        title={t.form.subcitySheetTitle}
        options={subcityOptions}
        selectedValue={subcity}
        searchPlaceholder={t.form.subcitySearchPlaceholder}
        onSelect={handleSubcityChange}
        onClose={() => setActiveSheet(null)}
      />

      <MobileSelectSheet
        isOpen={activeSheet === 'location'}
        title={
          localizedSelectedSubcity
            ? `${localizedSelectedSubcity} · ${t.form.locationSheetTitleSuffix}`
            : t.form.locationPlaceholder
        }
        options={locationOptions}
        selectedValue={specificLocation}
        searchPlaceholder={t.form.locationSearchPlaceholder}
        onSelect={(loc) => {
          setSpecificLocation(loc);
          if (errors.specificLocation) {
            setErrors((prev) => ({ ...prev, specificLocation: undefined }));
          }
        }}
        onClose={() => setActiveSheet(null)}
      />
    </motion.main>
  );
}
