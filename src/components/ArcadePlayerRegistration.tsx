import { useState, type FormEvent } from 'react';
import { ArrowLeft, ShieldCheck, Trophy } from 'lucide-react';
import { registerArcadePlayer } from '../services/arcadeClient.ts';
import type { PublicArcadePlayer } from '../arcade/arcadeConfig.ts';
import { triggerHaptic } from '../utils/haptics.ts';
import { normalizeEthiopianPhoneToE164 } from '../utils/phone.ts';

interface ArcadePlayerRegistrationProps {
  onRegistered: (player: PublicArcadePlayer, returning: boolean) => void;
  onBack: () => void;
}

export function ArcadePlayerRegistration({
  onRegistered,
  onBack,
}: ArcadePlayerRegistrationProps) {
  const [nickname, setNickname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanNick = nickname.replace(/\s+/g, ' ').trim();
    if (cleanNick.length < 2 || cleanNick.length > 24) {
      setErrorMsg('Enter a nickname between 2 and 24 characters.');
      return;
    }

    const normalized = normalizeEthiopianPhoneToE164(phoneNumber);
    if (!normalized) {
      setErrorMsg(
        'Enter a valid Ethiopian mobile number (e.g. 0911223344 or +251911223344).'
      );
      return;
    }

    setSubmitting(true);
    try {
      triggerHaptic(8);
      const result = await registerArcadePlayer(cleanNick, phoneNumber);
      if (!result?.player || typeof result.player.id !== 'string') {
        throw new Error('Server returned an invalid player profile. Please try again.');
      }
      onRegistered(result.player, Boolean(result.returning));
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to save player profile. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-5 sm:py-8 flex flex-col justify-center">
      <div className="rounded-2xl border border-[#245C44] bg-[#143B2B] p-5 sm:p-7 shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-mono font-semibold text-[#CEF04E]">
              POPO Competitive Arcade
            </p>
            <h3 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#F7F4EC]">
              Enter Player Profile
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-[#CDE0D6] leading-relaxed">
              Use one nickname and phone number across all games. Returning players
              can enter their existing phone number and nickname to continue.
            </p>
          </div>
          <span
            aria-hidden="true"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#CEF04E] text-[#143B2B] shadow-[0_3px_0_#0A1F16]"
          >
            <Trophy className="w-5 h-5" />
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="arcade-nickname"
              className="block text-xs font-semibold text-[#CDE0D6] mb-1.5"
            >
              Nickname
            </label>
            <input
              id="arcade-nickname"
              type="text"
              required
              minLength={2}
              maxLength={24}
              autoComplete="nickname"
              placeholder="e.g. PipeKing99"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-[#2D7A58] bg-[#0B2017] px-3.5 py-2.5 text-sm sm:text-base text-[#F7F4EC] placeholder:text-[#6B8E7E] focus:border-[#CEF04E] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="arcade-phone"
              className="block text-xs font-semibold text-[#CDE0D6] mb-1.5"
            >
              Ethiopian Mobile Number
            </label>
            <input
              id="arcade-phone"
              type="tel"
              required
              autoComplete="tel"
              inputMode="tel"
              placeholder="0911 223 344 or +251 911 223 344"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-[#2D7A58] bg-[#0B2017] px-3.5 py-2.5 text-sm sm:text-base text-[#F7F4EC] placeholder:text-[#6B8E7E] focus:border-[#CEF04E] focus:outline-none font-mono"
            />
            <p className="mt-1.5 text-[11px] text-[#9AB7A9]">
              Automatically normalized to E.164 (+251). Public leaderboards only
              show a masked number like +251 9•• ••• 123.
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-[#EF4444]/50 bg-[#7F1D1D]/40 px-3.5 py-2.5 text-xs sm:text-sm text-[#FECACA]"
            >
              {errorMsg}
            </div>
          )}

          {/* Honest No-Verification & Responsible Prize Disclosure */}
          <div className="rounded-xl border border-[#245C44] bg-[#0E291E] p-3.5 space-y-1.5 text-[11px] sm:text-xs text-[#CDE0D6] leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-[#F7F4EC]">
              <ShieldCheck className="w-4 h-4 text-[#CEF04E] shrink-0" />
              <span>Competition & Privacy Notice</span>
            </div>
            <p>
              No SMS or OTP verification is used right now. Your phone number is
              used only to identify competition entries and contact potential
              prize winners—it does not verify identity.
            </p>
            <p className="text-[#9AB7A9]">
              Free to play · No entry fee or purchase required · Admins manually
              review all scores and confirm winner contact details before any prize
              is awarded. Players under 18 require parent/guardian consent to
              claim prizes.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(6);
                onBack();
              }}
              className="min-h-[46px] px-4 py-2.5 rounded-xl border border-white/15 bg-transparent hover:bg-white/10 text-sm font-semibold text-[#CDE0D6] inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 min-h-[48px] px-6 py-3 rounded-xl bg-[#CEF04E] hover:bg-[#D9F66A] disabled:opacity-60 text-[#143B2B] font-display text-base font-bold shadow-[0_4px_0_#0A1F16] transition-all whitespace-nowrap cursor-pointer"
            >
              {submitting ? 'Saving Profile...' : 'Continue to Arcade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
