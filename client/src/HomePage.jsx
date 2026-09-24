import { useEffect, useState } from 'react';
import { api, ApiError } from './api/client.js';
import { useT } from './i18n/useT.js';
import { Button } from './components/ui/Button.jsx';

// Temporary placeholder page for Phase 0: proves design tokens, i18n/RTL and the API
// wrapper all work together. Replaced by the real Login page in Phase 6.
export default function HomePage() {
  const { t, language, setLanguage } = useT();
  const [status, setStatus] = useState('checking');
  const [serverTime, setServerTime] = useState(null);

  useEffect(() => {
    api
      .get('/health')
      .then((data) => {
        setServerTime(data.serverTime);
        setStatus('ok');
      })
      .catch((error) => {
        setStatus(error instanceof ApiError ? 'error' : 'error');
      });
  }, []);

  return (
    <main className="home-page">
      <div className="glass home-page__card">
        <div className="home-page__header">
          <h1>{t('appName')}</h1>
          <Button variant="secondary" onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}>
            {t('common.languageToggle')}
          </Button>
        </div>
        <p>{t(`health.${status}`)}</p>
        {serverTime && <p className="home-page__server-time">{serverTime}</p>}
      </div>
    </main>
  );
}
