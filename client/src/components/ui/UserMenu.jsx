import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n/useT.js';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { Avatar } from './Avatar.jsx';

// Avatar + name, with a dropdown for Log out (plus Profile, for students only - staff have
// no profile page). Shows the student's class or the staff member's role as the second line.
// Closes on outside click, Escape, or after navigating, so it never lingers open over the
// next page. Shared by the student MobileLayout and the staff DashboardLayout.
export function UserMenu() {
  const { t } = useT();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const isStudent = user?.role === 'student';

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={user.name} />
        <span className="user-menu__info">
          <span className="user-menu__name">{user.name}</span>
          {isStudent ? (
            user.className && <span className="user-menu__class">{user.className}</span>
          ) : (
            <span className="user-menu__class">{t(`common.role.${user.role}`)}</span>
          )}
        </span>
      </button>

      {open && (
        <div className="user-menu__panel glass" role="menu">
          {isStudent && (
            <Link
              to="/student/profile"
              role="menuitem"
              className="user-menu__item"
              onClick={() => setOpen(false)}
            >
              {t('nav.profile')}
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            className="user-menu__item"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            {t('common.logout')}
          </button>
        </div>
      )}
    </div>
  );
}
