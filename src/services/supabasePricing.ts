import {
  localizeLocation,
  localizeSubcity,
  type LanguageCode,
} from '../i18n/locationTranslations.ts';

export interface SupabaseSubcity {
  id: string;
  nameEn: string;
  nameAm: string | null;
  nameOro: string | null;
  nameTig: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface SupabaseLocation {
  id: string;
  subcityId: string;
  nameEn: string;
  nameAm: string | null;
  nameOro: string | null;
  nameTig: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface SupabaseServicePriority {
  id: string;
  code: string;
  nameEn: string;
  nameAm: string;
  priceEtb: number;
  minHours: number | null;
  maxHours: number | null;
  displayOrder: number;
  isActive: boolean;
}

export function normalizePriorityCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function mapSubcityRow(row: Record<string, unknown>): SupabaseSubcity | null {
  const id = asNonEmptyString(row.id);
  const nameEn =
    asNonEmptyString(row.name_en) ??
    asNonEmptyString(row.name) ??
    asNonEmptyString(row.title) ??
    asNonEmptyString(row.name_am);

  if (!id || !nameEn) {
    return null;
  }

  return {
    id,
    nameEn,
    nameAm: asNonEmptyString(row.name_am),
    nameOro: asNonEmptyString(row.name_oro) ?? asNonEmptyString(row.name_om),
    nameTig: asNonEmptyString(row.name_tig) ?? asNonEmptyString(row.name_ti),
    displayOrder: asFiniteNumber(row.display_order) ?? 0,
    isActive: row.is_active !== false,
  };
}

export function mapLocationRow(row: Record<string, unknown>): SupabaseLocation | null {
  const id = asNonEmptyString(row.id);
  const subcityId = asNonEmptyString(row.subcity_id);
  const nameEn =
    asNonEmptyString(row.name_en) ??
    asNonEmptyString(row.name) ??
    asNonEmptyString(row.title) ??
    asNonEmptyString(row.name_am);

  if (!id || !subcityId || !nameEn) {
    return null;
  }

  return {
    id,
    subcityId,
    nameEn,
    nameAm: asNonEmptyString(row.name_am),
    nameOro: asNonEmptyString(row.name_oro) ?? asNonEmptyString(row.name_om),
    nameTig: asNonEmptyString(row.name_tig) ?? asNonEmptyString(row.name_ti),
    displayOrder: asFiniteNumber(row.display_order) ?? 0,
    isActive: row.is_active !== false,
  };
}

export function mapServicePriorityRow(
  row: Record<string, unknown>
): SupabaseServicePriority | null {
  const id = asNonEmptyString(row.id);
  const code = asNonEmptyString(row.code);
  const nameEn = asNonEmptyString(row.name_en) ?? asNonEmptyString(row.name);
  const nameAm = asNonEmptyString(row.name_am) ?? nameEn;
  const priceEtb = asFiniteNumber(row.price_etb);

  if (!id || !code || !nameEn || !nameAm || priceEtb === null) {
    return null;
  }

  return {
    id,
    code,
    nameEn,
    nameAm,
    priceEtb,
    minHours: asFiniteNumber(row.min_hours),
    maxHours: asFiniteNumber(row.max_hours),
    displayOrder: asFiniteNumber(row.display_order) ?? 0,
    isActive: row.is_active !== false,
  };
}

export function sortSubcities<T extends { displayOrder: number; nameEn: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return a.nameEn.localeCompare(b.nameEn);
  });
}

export function sortServicePriorities<
  T extends { displayOrder: number; priceEtb: number; nameEn: string },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    if (a.priceEtb !== b.priceEtb) {
      return a.priceEtb - b.priceEtb;
    }
    return a.nameEn.localeCompare(b.nameEn);
  });
}

export function formatCanonicalEtbPrice(priceEtb: number): string {
  const formatted = Math.round(priceEtb).toLocaleString('en-US');
  return `${formatted} ETB`;
}

export function formatLocalizedEtbPrice(
  priceEtb: number | null,
  language: LanguageCode,
  fallback = ''
): string {
  if (priceEtb === null || !Number.isFinite(priceEtb)) {
    return fallback;
  }
  const formatted = Math.round(priceEtb).toLocaleString('en-US');
  switch (language) {
    case 'AM':
    case 'TIG':
      return `${formatted} ብር`;
    case 'ORO':
      return `Birrii ${formatted}`;
    case 'ENG':
    default:
      return `${formatted} ETB`;
  }
}

export function formatTimeframeFromHours(
  minHours: number | null | undefined,
  maxHours: number | null | undefined,
  language: LanguageCode,
  fallback = ''
): string {
  const min =
    typeof minHours === 'number' && Number.isFinite(minHours) ? minHours : null;
  const max =
    typeof maxHours === 'number' && Number.isFinite(maxHours) ? maxHours : null;

  if (max !== null && max > 0) {
    if ((min === null || min <= 1 || min === max) && max <= 24) {
      switch (language) {
        case 'AM':
          return `በ${max} ሰዓት ውስጥ`;
        case 'ORO':
          return `Sa’aatii ${max} keessatti`;
        case 'TIG':
          return `ኣብ ውሽጢ ${max} ሰዓት`;
        case 'ENG':
        default:
          return `Within ${max} hours`;
      }
    }

    if (
      min !== null &&
      min >= 24 &&
      min % 24 === 0 &&
      max >= 24 &&
      max % 24 === 0
    ) {
      const minDays = min / 24;
      const maxDays = max / 24;
      if (minDays === maxDays) {
        switch (language) {
          case 'AM':
            return `${maxDays} ቀን`;
          case 'ORO':
            return `Guyyaa ${maxDays}`;
          case 'TIG':
            return `${maxDays} መዓልቲ`;
          case 'ENG':
          default:
            return `${maxDays} ${maxDays === 1 ? 'day' : 'days'}`;
        }
      }

      switch (language) {
        case 'AM':
          return `ከ${minDays}–${maxDays} ቀናት`;
        case 'ORO':
          return `Guyyaa ${minDays}–${maxDays}`;
        case 'TIG':
          return `ካብ ${minDays}–${maxDays} መዓልቲ`;
        case 'ENG':
        default:
          return `${minDays}–${maxDays} days`;
      }
    }

    if (min !== null && min > 0) {
      if (min === max) {
        switch (language) {
          case 'AM':
          case 'TIG':
            return `${max} ሰዓት`;
          case 'ORO':
            return `Sa’aatii ${max}`;
          case 'ENG':
          default:
            return `${max} hours`;
        }
      }

      switch (language) {
        case 'AM':
          return `ከ${min}–${max} ሰዓታት`;
        case 'ORO':
          return `Sa’aatii ${min}–${max}`;
        case 'TIG':
          return `ካብ ${min}–${max} ሰዓታት`;
        case 'ENG':
        default:
          return `${min}–${max} hours`;
      }
    }

    switch (language) {
      case 'AM':
        return `በ${max} ሰዓት ውስጥ`;
      case 'ORO':
        return `Sa’aatii ${max} keessatti`;
      case 'TIG':
        return `ኣብ ውሽጢ ${max} ሰዓት`;
      case 'ENG':
      default:
        return `Within ${max} hours`;
    }
  }

  if (min !== null && min > 0) {
    switch (language) {
      case 'AM':
        return `ከ${min} ሰዓት ጀምሮ`;
      case 'ORO':
        return `Sa’aatii ${min}+`;
      case 'TIG':
        return `ካብ ${min} ሰዓት ጀሚሩ`;
      case 'ENG':
      default:
        return `${min}+ hours`;
    }
  }

  return fallback;
}

export function getLocalizedSubcityName(
  subcity: Pick<SupabaseSubcity, 'nameEn' | 'nameAm' | 'nameOro' | 'nameTig'>,
  language: LanguageCode
): string {
  switch (language) {
    case 'AM':
      return subcity.nameAm?.trim() || localizeSubcity(subcity.nameEn, 'AM');
    case 'ORO':
      return subcity.nameOro?.trim() || localizeSubcity(subcity.nameEn, 'ORO');
    case 'TIG':
      return subcity.nameTig?.trim() || localizeSubcity(subcity.nameEn, 'TIG');
    case 'ENG':
    default:
      return subcity.nameEn;
  }
}

export function getLocalizedLocationName(
  location: Pick<SupabaseLocation, 'nameEn' | 'nameAm' | 'nameOro' | 'nameTig'>,
  language: LanguageCode
): string {
  switch (language) {
    case 'AM':
      return location.nameAm?.trim() || localizeLocation(location.nameEn, 'AM');
    case 'ORO':
      return location.nameOro?.trim() || localizeLocation(location.nameEn, 'ORO');
    case 'TIG':
      return location.nameTig?.trim() || localizeLocation(location.nameEn, 'TIG');
    case 'ENG':
    default:
      return location.nameEn;
  }
}

export function getLocalizedPriorityName(
  priority: { code?: string | null; nameEn?: string | null; nameAm?: string | null },
  language: LanguageCode,
  tierLabels?: Partial<Record<string, { label: string }>>
): string {
  if (language === 'AM') {
    return priority.nameAm?.trim() || priority.nameEn?.trim() || priority.code?.trim() || '';
  }
  if (language === 'ENG') {
    return priority.nameEn?.trim() || priority.nameAm?.trim() || priority.code?.trim() || '';
  }

  const normalized = priority.code ? normalizePriorityCode(priority.code) : '';
  if (normalized && tierLabels && tierLabels[normalized]?.label) {
    return tierLabels[normalized]!.label;
  }

  return priority.nameEn?.trim() || priority.nameAm?.trim() || priority.code?.trim() || '';
}
