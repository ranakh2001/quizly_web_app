import { RouterProvider } from 'react-router-dom';
import { I18nProvider } from './i18n/I18nProvider.jsx';
import { router } from './router.jsx';

export default function App() {
  return (
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  );
}
