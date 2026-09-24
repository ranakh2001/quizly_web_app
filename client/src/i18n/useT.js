import { useContext } from 'react';
import { I18nContext } from './I18nProvider.jsx';

// Returns a t(key) function that reads dotted keys ('auth.title') from the active dictionary.
export function useT() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useT must be used within an I18nProvider');
  }

  const t = (key) =>
    key.split('.').reduce((value, part) => value?.[part], context.dictionary) ?? key;

  return { t, language: context.language, setLanguage: context.setLanguage };
}
