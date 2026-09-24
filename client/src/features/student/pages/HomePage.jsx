import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '../../../components/layout/MobileLayout.jsx';
import { LoadingState } from '../../../components/ui/LoadingState.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { api } from '../../../api/client.js';
import { useT } from '../../../i18n/useT.js';
import { errorMessageKey } from '../../../lib/errorMessage.js';
import { formatDateTime } from '../../../lib/time.js';

const TABS = ['available', 'upcoming', 'completed'];

export default function HomePage() {
  const { t } = useT();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [quizzes, setQuizzes] = useState([]);
  const [tab, setTab] = useState('available');
  // i18n key, not a translated string - see LoginPage.jsx for why that distinction matters.
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
        setErrorKey(errorMessageKey(error, { fallback: 'student.home.errorLoading' }));
        setStatus('error');
      });
  }

  useEffect(load, []);

  function openQuiz(quiz) {
    if (quiz.category === 'completed' && quiz.attemptId) {
      navigate(`/student/attempts/${quiz.attemptId}/result`);
      return;
    }
    navigate(`/student/quizzes/${quiz.id}`);
  }

  const visibleQuizzes = quizzes.filter((quiz) => quiz.category === tab);

  return (
    <MobileLayout title={t('student.home.title')}>
      <div className="tab-bar" role="tablist">
        {TABS.map((tabName) => (
          <button
            key={tabName}
            type="button"
            role="tab"
            aria-selected={tab === tabName}
            className={`tab-bar__item ${tab === tabName ? 'tab-bar__item--active' : ''}`}
            onClick={() => setTab(tabName)}
          >
            {t(`student.home.tab${tabName[0].toUpperCase()}${tabName.slice(1)}`)}
          </button>
        ))}
      </div>

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState message={t(errorKey)} onRetry={load} />}
      {status === 'ready' && visibleQuizzes.length === 0 && (
        <EmptyState message={t(`student.home.empty${tab[0].toUpperCase()}${tab.slice(1)}`)} />
      )}

      {status === 'ready' && visibleQuizzes.length > 0 && (
        <ul className="quiz-list">
          {visibleQuizzes.map((quiz) => (
            <li key={quiz.id}>
              <button type="button" className="quiz-card glass" onClick={() => openQuiz(quiz)}>
                <div className="quiz-card__header">
                  <h2 className="quiz-card__title">{quiz.title}</h2>
                  {quiz.negativeMarking && (
                    <span className="badge badge--warning">
                      {t('student.home.negativeMarkingBadge')}
                    </span>
                  )}
                </div>
                <p className="quiz-card__meta">
                  {tab === 'upcoming'
                    ? t('student.home.opens', { time: formatDateTime(quiz.opensAt) })
                    : t('student.home.closes', { time: formatDateTime(quiz.closesAt) })}
                  {' · '}
                  {t('student.home.timeLimit', { minutes: quiz.timeLimitMinutes })}
                </p>
                {tab === 'completed' && (
                  <p className="quiz-card__status">
                    {quiz.score !== null
                      ? t('student.home.scoreLabel', { score: quiz.score, maxScore: quiz.maxScore })
                      : t(`student.home.status${statusKey(quiz.attemptStatus)}`)}
                  </p>
                )}
                {tab === 'available' && quiz.attemptStatus === 'in_progress' && (
                  <p className="quiz-card__status">{t('student.home.statusInProgress')}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </MobileLayout>
  );
}

function statusKey(attemptStatus) {
  return attemptStatus
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}
