import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LanguageCode } from './locationTranslations.ts';
import { TRANSLATIONS, type TranslationDictionary } from './translations.ts';

const STORAGE_KEY = 'popo_language';
const VALID_LANGUAGES: LanguageCode[] = ['AM', 'ENG', 'ORO', 'TIG'];

function getInitialLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'AM';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && VALID_LANGUAGES.includes(saved as LanguageCode)) {
      return saved as LanguageCode;
    }
  } catch {
    // Ignore localStorage read errors
  }
  return 'AM';
}

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(getInitialLanguage);

  const setLanguage = useCallback((nextLang: LanguageCode) => {
    setLanguageState(nextLang);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLang);
    } catch {
      // Ignore localStorage write errors
    }
  }, []);

  const t = useMemo(() => TRANSLATIONS[language] ?? TRANSLATIONS.AM, [language]);

  useEffect(() => {
    document.documentElement.lang = t.meta.htmlLang;
    document.title = t.meta.pageTitle;
  }, [t]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
