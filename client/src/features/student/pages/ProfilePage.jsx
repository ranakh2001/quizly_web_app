import { MobileLayout } from '../../../components/layout/MobileLayout.jsx';
import { Avatar } from '../../../components/ui/Avatar.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { useT } from '../../../i18n/useT.js';
import { useAuth } from '../../../features/auth/AuthContext.jsx';

export default function ProfilePage() {
  const { t, language, setLanguage } = useT();
  const { user, logout } = useAuth();

  return (
    <MobileLayout title={t('student.profile.title')}>
      <div className="glass profile-card">
        <Avatar name={user?.name} />
        <p className="profile-card__name">{user?.name}</p>
        <p className="profile-card__meta">{t('auth.subtitle')}</p>
      </div>

      <div className="glass profile-fields">
        <div className="profile-field">
          <span className="profile-field__label">{t('student.profile.classLabel')}</span>
          <span className="profile-field__value">{user?.className}</span>
        </div>
        <div className="profile-field">
          <span className="profile-field__label">{t('student.profile.codeLabel')}</span>
          <bdi className="profile-field__value">{user?.studentCode}</bdi>
        </div>
        <div className="profile-field">
          <span className="profile-field__label">{t('student.profile.centreLabel')}</span>
          <span className="profile-field__value">{t('auth.subtitle')}</span>
        </div>
        <div className="profile-field">
          <span className="profile-field__label">{t('student.profile.languageLabel')}</span>
          <div className="role-toggle">
            <button
              type="button"
              className={`role-toggle__option${language === 'ar' ? ' role-toggle__option--active' : ''}`}
              onClick={() => setLanguage('ar')}
            >
              {t('student.profile.languageArabic')}
            </button>
            <button
              type="button"
              className={`role-toggle__option${language === 'en' ? ' role-toggle__option--active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              {t('student.profile.languageEnglish')}
            </button>
          </div>
        </div>
      </div>

      <p className="intro-card__note">{t('student.profile.passwordNote')}</p>

      <Button variant="secondary" onClick={logout}>
        {t('common.logout')}
      </Button>
    </MobileLayout>
  );
}
