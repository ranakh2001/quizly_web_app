import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/layout/DashboardLayout.jsx';
import { LoadingState } from '../../../components/ui/LoadingState.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { CreateQuizDialog } from '../components/CreateQuizDialog.jsx';
import { api } from '../../../api/client.js';
import { useT } from '../../../i18n/useT.js';
import { errorMessageKey } from '../../../lib/errorMessage.js';
import { formatDateTime } from '../../../lib/time.js';

export default function TeacherDashboardPage() {
  const { t, language } = useT();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [quizzes, setQuizzes] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
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
        setErrorKey(errorMessageKey(error, { fallback: 'teacher.dashboard.errorLoading' }));
        setStatus('error');
      });
  }

  useEffect(load, []);

  function handleCreated(quiz) {
    setCreateOpen(false);
    navigate(`/teacher/quizzes/${quiz.id}`);
  }

  return (
    <DashboardLayout title={t('teacher.dashboard.title')}>
      <div className="dashboard-toolbar">
        <Button onClick={() => setCreateOpen(true)}>{t('teacher.dashboard.createButton')}</Button>
      </div>

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState message={t(errorKey)} onRetry={load} />}
      {status === 'ready' && quizzes.length === 0 && (
        <EmptyState message={t('teacher.dashboard.empty')} />
      )}

      {status === 'ready' && quizzes.length > 0 && (
        <div className="table-scroll glass">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('teacher.dashboard.columnTitle')}</th>
                <th>{t('teacher.dashboard.columnQuestions')}</th>
                <th>{t('teacher.dashboard.columnStatus')}</th>
                <th>{t('teacher.dashboard.columnOpens')}</th>
                <th>{t('teacher.dashboard.columnCloses')}</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((quiz) => (
                <tr
                  key={quiz.id}
                  className="data-table__row-link"
                  onClick={() => navigate(`/teacher/quizzes/${quiz.id}`)}
                >
                  <td>
                    {quiz.title}
                    {quiz.locked && (
                      <span className="badge badge--warning">
                        {t('teacher.dashboard.lockedBadge')}
                      </span>
                    )}
                  </td>
                  <td>{quiz.questionCount}</td>
                  <td>
                    {t(quiz.status === 'published' ? 'quizStatus.published' : 'quizStatus.draft')}
                  </td>
                  <td>{formatDateTime(quiz.opensAt, language)}</td>
                  <td>{formatDateTime(quiz.closesAt, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateQuizDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </DashboardLayout>
  );
}
