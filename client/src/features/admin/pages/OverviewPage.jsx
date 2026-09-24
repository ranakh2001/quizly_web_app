import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../../components/layout/DashboardLayout.jsx';
import { LoadingState } from '../../../components/ui/LoadingState.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { StatCard } from '../../../components/ui/StatCard.jsx';
import { AverageScoreChart } from '../components/AverageScoreChart.jsx';
import { api } from '../../../api/client.js';
import { useT } from '../../../i18n/useT.js';
import { errorMessageKey } from '../../../lib/errorMessage.js';
import { formatDateTime } from '../../../lib/time.js';

const STATUS_BADGE_VARIANT = { draft: 'neutral', published: 'success', closed: 'warning' };

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
            <AverageScoreChart rows={overview.averageScoreByClass} />
          </div>

          <div className="glass editor-panel">
            <h2 className="editor-panel__title">{t('admin.overview.recentQuizzesTitle')}</h2>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('admin.overview.columnTitle')}</th>
                    <th>{t('admin.overview.columnTeacher')}</th>
                    <th>{t('admin.overview.columnStatus')}</th>
                    <th>{t('admin.overview.columnClasses')}</th>
                    <th>{t('admin.overview.columnSubmitted')}</th>
                    <th>{t('admin.overview.columnCreated')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {overview.recentQuizzes.map((quiz) => (
                    <tr key={quiz.id}>
                      <td>{quiz.title}</td>
                      <td>{quiz.teacherName}</td>
                      <td>
                        <span className={`badge badge--${STATUS_BADGE_VARIANT[quiz.status]}`}>
                          {t(`quizStatus.${quiz.status}`)}
                        </span>
                      </td>
                      <td>
                        {quiz.classNames.length > 0
                          ? quiz.classNames.join(', ')
                          : t('admin.overview.noClasses')}
                      </td>
                      <td>{quiz.submittedCount}</td>
                      <td>{formatDateTime(quiz.createdAt, language)}</td>
                      <td>
                        <Link className="data-table__link" to={`/admin/quizzes/${quiz.id}/results`}>
                          {t('admin.overview.resultsLink')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
