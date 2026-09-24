import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '../../../components/layout/MobileLayout.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { SkeletonCard } from '../../../components/ui/SkeletonCard.jsx';
import { StatCard } from '../../../components/ui/StatCard.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { api } from '../../../api/client.js';
import { useT } from '../../../i18n/useT.js';
import { errorMessageKey } from '../../../lib/errorMessage.js';
import { formatDateTime } from '../../../lib/time.js';

export default function ResultsPage() {
  const { t, language } = useT();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [attempts, setAttempts] = useState([]);
  // i18n key, not a translated string - see LoginPage.jsx for why that distinction matters.
  const [errorKey, setErrorKey] = useState(null);

  function load() {
    setStatus('loading');
    api
      .get('/attempts')
      .then((data) => {
        setAttempts(data.attempts);
        setStatus('ready');
      })
      .catch((error) => {
        setErrorKey(errorMessageKey(error, { fallback: 'student.results.errorLoading' }));
        setStatus('error');
      });
  }

  useEffect(load, []);

  const percentages = attempts
    .filter((attempt) => attempt.maxScore > 0)
    .map((attempt) => (attempt.score / attempt.maxScore) * 100);
  const averagePercent =
    percentages.length > 0
      ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length)
      : null;
  const bestPercent = percentages.length > 0 ? Math.round(Math.max(...percentages)) : null;

  return (
    <MobileLayout title={t('student.results.title')}>
      <div className="stat-grid">
        <StatCard value={attempts.length} label={t('student.results.summaryCompleted')} />
        <StatCard
          value={averagePercent !== null ? `${averagePercent}%` : '—'}
          label={t('student.results.summaryAverage')}
        />
        <StatCard
          value={bestPercent !== null ? `${bestPercent}%` : '—'}
          label={t('student.results.summaryBest')}
        />
      </div>

      {status === 'loading' && (
        <div className="results-cards" aria-busy="true">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {status === 'error' && <ErrorState message={t(errorKey)} onRetry={load} />}

      {status === 'ready' && attempts.length === 0 && (
        <EmptyState message={t('student.results.empty')} />
      )}

      {status === 'ready' && attempts.length > 0 && (
        <>
          <div className="results-table-wrapper glass">
            <table className="results-table">
              <thead>
                <tr>
                  <th scope="col">{t('student.results.columnQuiz')}</th>
                  <th scope="col">{t('student.results.columnTeacher')}</th>
                  <th scope="col">{t('student.results.columnDate')}</th>
                  <th scope="col">{t('student.results.columnScore')}</th>
                  <th scope="col">{t('student.results.columnPercent')}</th>
                  <th scope="col">{t('student.results.columnStatus')}</th>
                  <th scope="col" aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => {
                  const percent = percentOf(attempt);
                  const isAutoSubmitted = attempt.status === 'auto_submitted';
                  return (
                    <tr key={attempt.attemptId}>
                      <td>{attempt.quizTitle}</td>
                      <td>{attempt.teacherName}</td>
                      <td>
                        <bdi>{formatDateTime(attempt.submittedAt, language)}</bdi>
                      </td>
                      <td>
                        <bdi>
                          {attempt.score} / {attempt.maxScore}
                        </bdi>
                      </td>
                      <td>
                        <bdi>{percent}%</bdi>
                      </td>
                      <td>
                        <span
                          className={`badge ${isAutoSubmitted ? 'badge--warning' : 'badge--success'}`}
                        >
                          {t(
                            `student.home.status${isAutoSubmitted ? 'AutoSubmitted' : 'Submitted'}`,
                          )}
                        </span>
                      </td>
                      <td>
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/student/attempts/${attempt.attemptId}/result`)}
                        >
                          {t('student.results.view')}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="results-cards">
            {attempts.map((attempt) => {
              const percent = percentOf(attempt);
              const isAutoSubmitted = attempt.status === 'auto_submitted';
              return (
                <li key={attempt.attemptId}>
                  <div className="glass result-row-card">
                    <h2 className="result-row-card__title">{attempt.quizTitle}</h2>
                    <p className="result-row-card__meta">
                      {attempt.teacherName} ·{' '}
                      <bdi>{formatDateTime(attempt.submittedAt, language)}</bdi>
                    </p>
                    <div className="result-row-card__footer">
                      <span className="result-row-card__score">
                        <bdi>
                          {attempt.score} / {attempt.maxScore} ({percent}%)
                        </bdi>
                      </span>
                      <span
                        className={`badge ${isAutoSubmitted ? 'badge--warning' : 'badge--success'}`}
                      >
                        {t(`student.home.status${isAutoSubmitted ? 'AutoSubmitted' : 'Submitted'}`)}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/student/attempts/${attempt.attemptId}/result`)}
                    >
                      {t('student.results.view')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </MobileLayout>
  );
}

function percentOf(attempt) {
  if (!attempt.maxScore) return 0;
  return Math.round((attempt.score / attempt.maxScore) * 100);
}
