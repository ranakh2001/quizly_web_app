import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/layout/DashboardLayout.jsx';
import { LoadingState } from '../../../components/ui/LoadingState.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { api } from '../../../api/client.js';
import { useT } from '../../../i18n/useT.js';
import { errorMessageKey } from '../../../lib/errorMessage.js';

export default function AdminQuizListPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [quizzes, setQuizzes] = useState([]);
  const [errorKey, setErrorKey] = useState(null);

  function load() {
    setStatus('loading');
    api
      .get('/quizzes')
      .then((data) => {
        setQuizzes(data.quizzes);
        setStatus('ready');
      })
      .catch((error) => {
        setErrorKey(errorMessageKey(error, { fallback: 'admin.quizList.errorLoading' }));
        setStatus('error');
      });
  }

  useEffect(load, []);

  return (
    <DashboardLayout title={t('results.title')}>
      <p className="intro-card__note">{t('admin.quizList.subtitle')}</p>

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState message={t(errorKey)} onRetry={load} />}
      {status === 'ready' && quizzes.length === 0 && (
        <EmptyState message={t('admin.quizList.empty')} />
      )}

      {status === 'ready' && quizzes.length > 0 && (
        <div className="table-scroll glass">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('admin.overview.columnTitle')}</th>
                <th>{t('admin.overview.columnTeacher')}</th>
                <th>{t('admin.overview.columnStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((quiz) => (
                <tr
                  key={quiz.id}
                  className="data-table__row-link"
                  onClick={() => navigate(`/admin/quizzes/${quiz.id}/results`)}
                >
                  <td>{quiz.title}</td>
                  <td>{quiz.teacherName}</td>
                  <td>
                    {t(quiz.status === 'published' ? 'quizStatus.published' : 'quizStatus.draft')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
