import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '../../../components/layout/MobileLayout.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { SkeletonCard } from '../../../components/ui/SkeletonCard.jsx';
import { StatCard } from '../../../components/ui/StatCard.jsx';
import { api } from '../../../api/client.js';
import { useT } from '../../../i18n/useT.js';
import { useAuth } from '../../../features/auth/AuthContext.jsx';
import { errorMessageKey } from '../../../lib/errorMessage.js';
import { formatDateTime } from '../../../lib/time.js';

const TABS = ['available', 'upcoming', 'completed'];

export default function HomePage() {
  const { t, language } = useT();
  const { user } = useAuth();
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

  const counts = {
    available: quizzes.filter((quiz) => quiz.category === 'available').length,
    upcoming: quizzes.filter((quiz) => quiz.category === 'upcoming').length,
    completed: quizzes.filter((quiz) => quiz.category === 'completed').length,
  };
  const visibleQuizzes = quizzes.filter((quiz) => quiz.category === tab);
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <MobileLayout title={t('student.home.title')}>
      <div className="home-header">
        <h1 className="home-header__greeting">{t('student.home.greeting', { name: firstName })}</h1>
        {user?.className && (
          <p className="home-header__meta">
            {t('student.home.classAndCode', { className: user.className, code: user.studentCode })}
          </p>
        )}
      </div>

      <div className="stat-grid">
        <StatCard value={counts.available} label={t('student.home.statAvailable')} />
        <StatCard value={counts.upcoming} label={t('student.home.statUpcoming')} />
        <StatCard value={counts.completed} label={t('student.home.statCompleted')} />
      </div>

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
            {t(`student.home.tab${tabName[0].toUpperCase()}${tabName.slice(1)}`, {
              count: counts[tabName],
            })}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <div className="quiz-list" aria-busy="true">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

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
                  {tab === 'upcoming' && (
                    <span className="badge badge--neutral">
                      {t('student.home.notOpenYetBadge')}
                    </span>
                  )}
                  {tab !== 'upcoming' && quiz.negativeMarking && (
                    <span className="badge badge--warning">
                      {t('student.home.negativeMarkingBadge')}
                    </span>
                  )}
                </div>
                <p className="quiz-card__meta">
                  {tab === 'upcoming'
                    ? t('student.home.opens', { time: formatDateTime(quiz.opensAt, language) })
                    : t('student.home.closes', { time: formatDateTime(quiz.closesAt, language) })}
                  {' · '}
                  {t('student.home.timeLimit', { minutes: quiz.timeLimitMinutes })}
                </p>
                {tab === 'completed' && (
                  <p className="quiz-card__status">
                    {quiz.score !== null ? (
                      <>
                        {t('student.home.scoreLabel')}{' '}
                        {/* One isolate around the whole fragment, not one per number -
                            the neutral "/" between two separately-isolated numbers
                            still reorders in RTL (see ScoreRing.jsx). */}
                        <bdi>
                          {quiz.score} / {quiz.maxScore}
                        </bdi>
                      </>
                    ) : (
                      t(`student.home.status${statusKey(quiz.attemptStatus)}`)
                    )}
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
