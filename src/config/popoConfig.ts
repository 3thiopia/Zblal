export type ServicePriorityCode = 'STANDARD' | 'PREMIUM' | 'SUPER_FAST';

export interface ServicePriorityTier {
  code: ServicePriorityCode;
  label: string;
  timeframe: string;
  /**
   * Configurable price in Ethiopian Birr (ETB).
   * Keep as null until actual business prices are provided so placeholder
   * labels are displayed transparently without inventing numbers.
   */
  priceEtb: number | null;
  placeholderPriceLabel: string;
  note: string;
}

/**
 * Configurable service prices in Ethiopian Birr (ETB).
 * Replace `null` with actual integer ETB prices (e.g., 3500) when ready.
 */
export const CONFIGURABLE_PRICES_ETB: Record<ServicePriorityCode, number | null> = {
  STANDARD: 3500,
  PREMIUM: 5000,
  SUPER_FAST: 8000,
};

export const SERVICE_TIERS: ServicePriorityTier[] = [
  {
    code: 'STANDARD',
    label: 'STANDARD',
    timeframe: '3–5 days',
    priceEtb: CONFIGURABLE_PRICES_ETB.STANDARD,
    placeholderPriceLabel: 'TBD · ETB',
    note: 'Scheduled route dispatch',
  },
  {
    code: 'PREMIUM',
    label: 'PREMIUM',
    timeframe: '1–2 days',
    priceEtb: CONFIGURABLE_PRICES_ETB.PREMIUM,
    placeholderPriceLabel: 'TBD · ETB',
    note: 'Priority queue dispatch',
  },
  {
    code: 'SUPER_FAST',
    label: 'SUPER FAST',
    timeframe: 'Within 24 hours',
    priceEtb: CONFIGURABLE_PRICES_ETB.SUPER_FAST,
    placeholderPriceLabel: 'TBD · ETB',
    note: 'Immediate express dispatch',
  },
];

export function formatServicePrice(tier: ServicePriorityTier): string {
  if (tier.priceEtb !== null && Number.isFinite(tier.priceEtb)) {
    return `${tier.priceEtb.toLocaleString('en-US')} ETB`;
  }
  return tier.placeholderPriceLabel;
}

export function getServiceTier(code: string): ServicePriorityTier | undefined {
  return SERVICE_TIERS.find((tier) => tier.code === code);
}
