import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { LoadingState } from '../../components/ui/LoadingState.jsx';

// Route guard: waits for the session check, sends anonymous users to /login, and sends a
// signed-in user with the wrong role back to their own home instead of a 403 page.
export function RequireAuth({ roles }) {
  const { user, status } = useAuth();

  if (status === 'loading') return <LoadingState />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;

  return <Outlet />;
}
