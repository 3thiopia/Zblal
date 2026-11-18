import { useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Gamepad2,
  Loader2,
  ShieldCheck,
  Trophy,
  UserPlus,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import {
  loginReturningArcadePlayer,
  registerArcadePlayer,
} from '../services/arcadeClient.ts';
import type { PublicArcadePlayer } from '../arcade/arcadeConfig.ts';
import { triggerHaptic } from '../utils/haptics.ts';
import { normalizeEthiopianPhoneToE164 } from '../utils/phone.ts';
import { LanguageSelector } from './LanguageSelector.tsx';

type OnboardingMode = 'register' | 'login';

interface ArcadePlayerRegistrationProps {
  initialNotice?: string | null;
  onRegistered: (player: PublicArcadePlayer, returning: boolean) => void;
  onBack: () => void;
}

export function ArcadePlayerRegistration({
  initialNotice = null,
  onRegistered,
  onBack,
}: ArcadePlayerRegistrationProps) {
  const { t } = useLanguage();
  const reg = t.arcade.registration;

  const [mode, setMode] = useState<OnboardingMode>('register');
  const [nickname, setNickname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [offerCreateFromLogin, setOfferCreateFromLogin] = useState(false);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);
  const nicknameInputRef = useRef<HTMLInputElement>(null);

  const handleModeChange = (nextMode: OnboardingMode) => {
    if (submitting || nextMode === mode) return;
    triggerHaptic(5);
    setMode(nextMode);
    setErrorMsg(null);
    setOfferCreateFromLogin(false);
  };

  const handleSwitchToRegisterWithPhone = () => {
    triggerHaptic(6);
    setMode('register');
    setErrorMsg(null);
    setOfferCreateFromLogin(false);
    window.requestAnimationFrame(() => {
      nicknameInputRef.current?.focus();
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setOfferCreateFromLogin(false);

    const normalized = normalizeEthiopianPhoneToE164(phoneNumber);
    if (!normalized) {
      setErrorMsg(reg.errInvalidPhone);
      return;
    }

    if (mode === 'register') {
      const cleanNick = nickname.replace(/\s+/g, ' ').trim();
      if (cleanNick.length < 2 || cleanNick.length > 24) {
        setErrorMsg(reg.errInvalidNickname);
        return;
      }

      setSubmitting(true);
      try {
        triggerHaptic(8);
        const result = await registerArcadePlayer(cleanNick, phoneNumber);
        if (!result?.player || typeof result.player.id !== 'string') {
          throw new Error(reg.errInvalidServerProfile);
        }
        onRegistered(result.player, Boolean(result.returning));
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        if (status === 403) {
          setErrorMsg(reg.errSuspendedProfile);
        } else {
          setErrorMsg(
            err instanceof Error ? err.message : reg.errSaveProfile
          );
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Returning player login: phone number ONLY (no nickname, no OTP)
    setSubmitting(true);
    try {
      triggerHaptic(8);
      const result = await loginReturningArcadePlayer(phoneNumber);
      if (!result?.player || typeof result.player.id !== 'string') {
        throw new Error(reg.errInvalidServerProfile);
      }
      onRegistered(result.player, true);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        setOfferCreateFromLogin(true);
        setErrorMsg(reg.errNotFoundForPhone);
      } else if (status === 403) {
        setErrorMsg(reg.errSuspendedProfile);
      } else {
        setErrorMsg(
          err instanceof Error ? err.message : reg.errFindProfile
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`flex-1 w-full max-w-lg mx-auto px-4 sm:px-6 py-4 sm:py-8 flex flex-col justify-start sm:justify-center overflow-y-auto ${
        t.meta.isEthiopic ? 'font-ethiopic' : ''
      }`}
    >
      <div className="rounded-3xl border border-[#245C44] bg-[#133829] p-5 sm:p-7 shadow-[0_20px_48px_rgba(0,0,0,0.42)]">
        {/* Mobile Language Switcher Bar (desktop has it in header too) */}
        <div className="md:hidden mb-4 flex items-center justify-between gap-2 rounded-2xl border border-[#245C44] bg-[#0B2219] px-3 py-1">
          <span className="text-[11px] font-semibold text-[#9AB7A9]">
            {t.arcade.languageLabel}
          </span>
          <LanguageSelector variant="dark" layoutGroupId="arcade-reg-mobile-lang" compact />
        </div>

        <div className="flex items-center gap-3.5">
          <span
            aria-hidden="true"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#CEF04E] text-[#143B2B] shadow-[0_4px_0_#0A1F16]"
          >
            <Gamepad2 className="w-6 h-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-mono font-semibold text-[#CEF04E]">
              {reg.cardKicker}
            </p>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#F7F4EC] leading-tight">
              {mode === 'login' ? reg.returningTitle : reg.newPlayerTitle}
            </h3>
          </div>
        </div>

        {/* Mode Switcher: New Player vs Returning Player (Phone Only) */}
        <div
          role="tablist"
          aria-label={reg.entryModeAria}
          className="mt-5 grid grid-cols-2 gap-1.5 rounded-2xl border border-[#245C44] bg-[#0B2219] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            onClick={() => handleModeChange('register')}
            disabled={submitting}
            className={`min-h-[44px] px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap truncate cursor-pointer ${
              mode === 'register'
                ? 'bg-[#CEF04E] text-[#143B2B] shadow-[0_2px_0_#0A1F16]'
                : 'text-[#CDE0D6] hover:text-[#F7F4EC]'
            }`}
          >
            {reg.tabNewPlayer}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => handleModeChange('login')}
            disabled={submitting}
            className={`min-h-[44px] px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap truncate cursor-pointer ${
              mode === 'login'
                ? 'bg-[#CEF04E] text-[#143B2B] shadow-[0_2px_0_#0A1F16]'
                : 'text-[#CDE0D6] hover:text-[#F7F4EC]'
            }`}
          >
            {reg.tabReturningPlayer}
          </button>
        </div>

        {initialNotice && (
          <div
            role="status"
            className="mt-4 rounded-2xl border border-[#FACC15]/40 bg-[#422006]/45 px-4 py-2.5 text-xs text-[#FEF08A] leading-relaxed"
          >
            {initialNotice}
          </div>
        )}

        <p className="mt-3.5 text-xs sm:text-sm text-[#CDE0D6] leading-relaxed">
          {mode === 'login' ? reg.returningSubtitle : reg.newPlayerSubtitle}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="arcade-nickname"
                className="block text-xs font-semibold text-[#CDE0D6] mb-1.5"
              >
                {reg.nicknameLabel}
              </label>
              <input
                ref={nicknameInputRef}
                id="arcade-nickname"
                type="text"
                required
                minLength={2}
                maxLength={24}
                autoComplete="nickname"
                placeholder={reg.nicknamePlaceholder}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={submitting}
                className="w-full min-h-[48px] rounded-2xl border border-[#2D7A58] bg-[#0B2219] px-4 py-3 text-base text-[#F7F4EC] placeholder:text-[#6B8E7E] focus:border-[#CEF04E] focus:outline-none disabled:opacity-60"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="arcade-phone"
              className="block text-xs font-semibold text-[#CDE0D6] mb-1.5"
            >
              {reg.phoneLabel}
            </label>
            <input
              id="arcade-phone"
              type="tel"
              required
              autoComplete="tel"
              inputMode="tel"
              placeholder={reg.phonePlaceholder}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={submitting}
              className="w-full min-h-[48px] rounded-2xl border border-[#2D7A58] bg-[#0B2219] px-4 py-3 text-base text-[#F7F4EC] placeholder:text-[#6B8E7E] focus:border-[#CEF04E] focus:outline-none font-mono disabled:opacity-60"
            />
            <p className="mt-1.5 text-[11px] text-[#9AB7A9] leading-relaxed">
              {reg.phoneHelp}
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-2xl border border-[#EF4444]/50 bg-[#7F1D1D]/45 px-4 py-3 text-xs sm:text-sm text-[#FECACA] space-y-2.5 leading-relaxed"
            >
              <p>{errorMsg}</p>
              {offerCreateFromLogin && (
                <button
                  type="button"
                  onClick={handleSwitchToRegisterWithPhone}
                  className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-[#CEF04E] hover:bg-[#D9F66A] text-[#143B2B] font-display text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span className="truncate">{reg.createFromLoginCta}</span>
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(6);
                onBack();
              }}
              disabled={submitting}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl border border-white/15 bg-transparent hover:bg-white/10 active:scale-[0.98] text-sm font-semibold text-[#CDE0D6] inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>{reg.backToSite}</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex-1 min-h-[50px] px-5 py-3 rounded-2xl bg-[#CEF04E] hover:bg-[#D9F66A] active:translate-y-0.5 disabled:opacity-65 text-[#143B2B] font-display text-sm sm:text-base font-bold shadow-[0_4px_0_#0A1F16] inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>{mode === 'login' ? reg.restoring : reg.saving}</span>
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4 shrink-0" />
                  <span>
                    {mode === 'login' ? reg.restoreAndPlay : reg.createAndPlay}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 rounded-2xl border border-[#245C44] bg-[#0B2219] px-3.5 py-2.5 text-[11px] sm:text-xs text-[#CDE0D6]">
          <button
            type="button"
            onClick={() => setShowPrivacyDetails((v) => !v)}
            aria-expanded={showPrivacyDetails}
            className="w-full min-h-[36px] flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#F7F4EC]">
              <ShieldCheck className="w-4 h-4 text-[#CEF04E] shrink-0" />
              <span>{reg.noOtpTitle}</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#9AB7A9] transition-transform shrink-0 ${
                showPrivacyDetails ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showPrivacyDetails && (
            <div className="pt-2 mt-2 border-t border-[#245C44]/70 space-y-1.5 text-[#9AB7A9] leading-relaxed">
              <p>{reg.noOtpDetail1}</p>
              <p>{reg.noOtpDetail2}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
