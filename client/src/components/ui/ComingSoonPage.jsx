import { useAuth } from '../../features/auth/AuthContext.jsx';
import { useT } from '../../i18n/useT.js';
import { Button } from './Button.jsx';

// Placeholder landing page for a role whose real screens haven't been built yet.
// Proves the login -> role-routing -> logout loop end to end before that phase lands.
export function ComingSoonPage({ title }) {
  const { user, logout } = useAuth();
  const { t } = useT();

  return (
    <main className="auth-page">
      <div className="glass auth-page__card">
        <h1 className="auth-page__title">{title}</h1>
        <p className="auth-page__subtitle">{user?.name}</p>
        <Button variant="secondary" onClick={logout}>
          {t('common.logout')}
        </Button>
      </div>
    </main>
  );
}
