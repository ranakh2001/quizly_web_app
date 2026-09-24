import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout.jsx';
import { LoadingState } from '../../../components/ui/LoadingState.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { StatCard } from '../../../components/ui/StatCard.jsx';
import { api } from '../../../api/client.js';
import { useT } from '../../../i18n/useT.js';
import { errorMessageKey } from '../../../lib/errorMessage.js';
import { formatDateTime } from '../../../lib/time.js';

export default function AdminOverviewPage() {
  const { t, language } = useT();
  const [status, setStatus] = useState('loading');
  const [overview, setOverview] = useState(null);
  const [errorKey, setErrorKey] = useState(null);

  function load() {
    setStatus('loading');
    api
      .get('/admin/overview')
      .then((data) => {
        setOverview(data);
        setStatus('ready');
      })
      .catch((error) => {
        setErrorKey(errorMessageKey(error, { fallback: 'admin.overview.errorLoading' }));
        setStatus('error');
      });
  }

  useEffect(load, []);

  return (
    <DashboardLayout title={t('admin.overview.title')}>
      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState message={t(errorKey)} onRetry={load} />}

      {status === 'ready' && overview && (
        <>
          <div className="stat-grid">
            <StatCard value={overview.totals.students} label={t('admin.overview.students')} />
            <StatCard value={overview.totals.teachers} label={t('admin.overview.teachers')} />
            <StatCard value={overview.totals.quizzes} label={t('admin.overview.quizzes')} />
            <StatCard value={overview.totals.classes} label={t('admin.overview.classes')} />
          </div>

          <div className="glass editor-panel">
            <h2 className="editor-panel__title">{t('admin.overview.avgByClassTitle')}</h2>
            <ul className="correct-rate-list">
              {overview.averageScoreByClass.map((row) => (
                <li key={row.classId} className="correct-rate-list__item">
                  <span className="correct-rate-list__text">{row.className}</span>
                  <span className="correct-rate-list__value">
                    {row.averagePercent === null
                      ? t('admin.overview.noAttempts')
                      : `${row.averagePercent}%`}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="table-scroll glass">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('admin.overview.columnTitle')}</th>
                  <th>{t('admin.overview.columnTeacher')}</th>
                  <th>{t('admin.overview.columnStatus')}</th>
                  <th>{t('admin.overview.columnCreated')}</th>
                </tr>
              </thead>
              <tbody>
                {overview.recentQuizzes.map((quiz) => (
                  <tr key={quiz.id}>
                    <td>{quiz.title}</td>
                    <td>{quiz.teacherName}</td>
                    <td>
                      {t(quiz.status === 'published' ? 'quizStatus.published' : 'quizStatus.draft')}
                    </td>
                    <td>{formatDateTime(quiz.createdAt, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
