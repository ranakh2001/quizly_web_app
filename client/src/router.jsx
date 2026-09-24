import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth } from './features/auth/RequireAuth.jsx';
import { useAuth } from './features/auth/AuthContext.jsx';
import { LoadingState } from './components/ui/LoadingState.jsx';
import { ComingSoonPage } from './components/ui/ComingSoonPage.jsx';
import LoginPage from './features/auth/pages/LoginPage.jsx';
import StudentHomePage from './features/student/pages/HomePage.jsx';
import QuizIntroPage from './features/student/pages/QuizIntroPage.jsx';
import TakingPage from './features/student/pages/TakingPage.jsx';
import ResultPage from './features/student/pages/ResultPage.jsx';

// "/" has no role of its own - send the visitor to /login or to their own home once the
// session check (see AuthContext) has finished.
function RootRedirect() {
  const { user, status } = useAuth();
  if (status === 'loading') return <LoadingState />;
  return <Navigate to={user ? `/${user.role}` : '/login'} replace />;
}

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth roles={['student']} />,
    children: [
      { path: '/student', element: <StudentHomePage /> },
      { path: '/student/quizzes/:quizId', element: <QuizIntroPage /> },
      { path: '/student/attempts/:attemptId', element: <TakingPage /> },
      { path: '/student/attempts/:attemptId/result', element: <ResultPage /> },
    ],
  },
  {
    element: <RequireAuth roles={['teacher']} />,
    children: [{ path: '/teacher', element: <ComingSoonPage title="Teacher" /> }],
  },
  {
    element: <RequireAuth roles={['admin']} />,
    children: [{ path: '/admin', element: <ComingSoonPage title="Admin" /> }],
  },
]);
