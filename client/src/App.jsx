import { RouterProvider } from 'react-router-dom';
import { I18nProvider } from './i18n/I18nProvider.jsx';
import { AuthProvider } from './features/auth/AuthContext.jsx';
import { router } from './router.jsx';

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </I18nProvider>
  );
}
