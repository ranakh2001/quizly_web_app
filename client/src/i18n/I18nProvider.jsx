import { createContext, useEffect, useMemo, useState } from 'react';
import ar from './ar.js';
import en from './en.js';

const dictionaries = { ar, en };
const directions = { ar: 'rtl', en: 'ltr' };
const STORAGE_KEY = 'quizly.language';

export const I18nContext = createContext(null);

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') return stored;
  } catch {
    // localStorage unavailable (e.g. private browsing); fall back to default.
  }
  return 'ar';
}

// Provides { language, setLanguage, dictionary } and keeps <html lang/dir> in sync,
// which is what makes Arabic RTL and the English toggle work app-wide.
export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = directions[language];
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Ignore write failures; language just won't persist across reloads.
    }
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, dictionary: dictionaries[language] }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
