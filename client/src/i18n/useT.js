import { useContext } from 'react';
import { I18nContext } from './I18nProvider.jsx';

// Returns a t(key, params?) function that reads dotted keys ('auth.title') from the active
// dictionary, substituting {name} placeholders from params (e.g. t('taking.of', { n: 3 })).
export function useT() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useT must be used within an I18nProvider');
  }

  const t = (key, params) => {
    const template =
      key.split('.').reduce((value, part) => value?.[part], context.dictionary) ?? key;
    if (!params) return template;
    return Object.entries(params).reduce(
      (result, [name, value]) => result.replaceAll(`{${name}}`, value),
      template,
    );
  };

  return { t, language: context.language, setLanguage: context.setLanguage };
}
