import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useT } from '../../../i18n/useT.js';
import { ApiError } from '../../../api/client.js';
import { Button } from '../../../components/ui/Button.jsx';

const ERROR_KEYS = {
  UNAUTHORIZED: 'auth.invalidCredentials',
  TOO_MANY_ATTEMPTS: 'auth.tooManyAttempts',
};

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useT();
  const [role, setRole] = useState('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (e.g. navigated back here manually) - go straight to their home.
  if (user) return <Navigate to={`/${user.role}`} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const credentials =
        role === 'student'
          ? { studentCode: identifier.trim(), password }
          : { username: identifier.trim(), password };
      const loggedInUser = await login(credentials);
      navigate(`/${loggedInUser.role}`, { replace: true });
    } catch (err) {
      const key = err instanceof ApiError ? ERROR_KEYS[err.code] : null;
      setError(t(key ?? 'common.genericError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="glass auth-page__card">
        <div className="auth-page__top">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          >
            {t('common.languageToggle')}
          </Button>
        </div>

        <h1 className="auth-page__title">{t('auth.title')}</h1>
        <p className="auth-page__subtitle">{t('auth.subtitle')}</p>

        <div className="role-toggle" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={role === 'student'}
            className={`role-toggle__option ${role === 'student' ? 'role-toggle__option--active' : ''}`}
            onClick={() => setRole('student')}
          >
            {t('auth.studentTab')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === 'staff'}
            className={`role-toggle__option ${role === 'staff' ? 'role-toggle__option--active' : ''}`}
            onClick={() => setRole('staff')}
          >
            {t('auth.staffTab')}
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">
              {role === 'student' ? t('auth.studentCodeLabel') : t('auth.usernameLabel')}
            </span>
            <input
              className="field__input"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">{t('auth.passwordLabel')}</span>
            <input
              className="field__input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting}>
            {submitting ? t('auth.submitting') : t('auth.submit')}
          </Button>
        </form>
      </div>
    </main>
  );
}
