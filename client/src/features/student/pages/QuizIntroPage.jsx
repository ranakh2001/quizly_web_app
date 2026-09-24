import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MobileLayout } from '../../../components/layout/MobileLayout.jsx';
import { LoadingState } from '../../../components/ui/LoadingState.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { Dialog } from '../../../components/ui/Dialog.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { api } from '../../../api/client.js';
import { useT } from '../../../i18n/useT.js';
import { errorMessageKey } from '../../../lib/errorMessage.js';
import { formatDateTime } from '../../../lib/time.js';

export default function QuizIntroPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { t } = useT();
  const [status, setStatus] = useState('loading');
  const [quiz, setQuiz] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  // i18n keys, not translated strings - see LoginPage.jsx for why that distinction matters.
  const [loadErrorKey, setLoadErrorKey] = useState(null);
  const [startErrorKey, setStartErrorKey] = useState(null);

  function load() {
    setStatus('loading');
    api
      .get(`/quizzes/${quizId}`)
      .then((data) => {
        setQuiz(data.quiz);
        setStatus('ready');
      })
      .catch((error) => {
        setLoadErrorKey(errorMessageKey(error, { fallback: 'student.intro.errorLoading' }));
        setStatus('error');
      });
  }

  useEffect(load, [quizId]);

  async function handleStart() {
    setStarting(true);
    setStartErrorKey(null);
    try {
      const data = await api.post('/attempts', { quizId: Number(quizId) });
      navigate(`/student/attempts/${data.attempt.id}`, { replace: true });
    } catch (error) {
      setStartErrorKey(errorMessageKey(error));
      setStarting(false);
      setConfirmOpen(false);
    }
  }

  if (status === 'loading') {
    return (
      <MobileLayout title="" onBack={() => navigate('/student')}>
        <LoadingState />
      </MobileLayout>
    );
  }

  if (status === 'error' || !quiz) {
    return (
      <MobileLayout title="" onBack={() => navigate('/student')}>
        <ErrorState message={t(loadErrorKey)} onRetry={load} />
      </MobileLayout>
    );
  }

  const now = Date.now();
  const notOpenYet = now < new Date(quiz.opensAt).getTime();
  const closed = now >= new Date(quiz.closesAt).getTime();
  const canStart = !notOpenYet && !closed && !quiz.hasAttempted;

  return (
    <MobileLayout title={quiz.title} onBack={() => navigate('/student')}>
      <div className="intro-layout">
        <div className="glass intro-card">
          <h2 className="intro-card__title">{t('student.intro.rulesTitle')}</h2>
          <dl className="intro-card__facts">
            <div>
              <dt>{t('student.intro.timeLimitLabel')}</dt>
              <dd>{t('student.intro.timeLimitValue', { minutes: quiz.timeLimitMinutes })}</dd>
            </div>
            <div>
              <dt>{t('student.intro.questionCountLabel')}</dt>
              <dd>{quiz.questionCount}</dd>
            </div>
            <div>
              <dt>{t('student.intro.totalPointsLabel')}</dt>
              <dd>{quiz.totalPoints}</dd>
            </div>
          </dl>
        </div>

        <div className="glass intro-card">
          <p className="intro-card__note">
            {quiz.negativeMarking
              ? t('student.intro.negativeMarkingOn', {
                  percent: Math.round(quiz.penaltyRatio * 100),
                })
              : t('student.intro.negativeMarkingOff')}
          </p>

          <p className="intro-card__note intro-card__note--warning">
            {t('student.intro.oneAttemptWarning')}
          </p>

          {notOpenYet && (
            <p className="intro-card__note intro-card__note--warning">
              {t('student.intro.notOpenYet', { time: formatDateTime(quiz.opensAt) })}
            </p>
          )}
          {closed && !quiz.hasAttempted && (
            <p className="intro-card__note intro-card__note--warning">
              {t('student.intro.closedMessage', { time: formatDateTime(quiz.closesAt) })}
            </p>
          )}
          {startErrorKey && (
            <p className="form-error" role="alert">
              {t(startErrorKey)}
            </p>
          )}

          {quiz.attemptStatus === 'in_progress' ? (
            <Button onClick={() => navigate(`/student/attempts/${quiz.attemptId}`)}>
              {t('student.intro.resumeButton')}
            </Button>
          ) : quiz.hasAttempted ? (
            <Button onClick={() => navigate(`/student/attempts/${quiz.attemptId}/result`)}>
              {t('student.intro.viewResult')}
            </Button>
          ) : (
            <Button disabled={!canStart} onClick={() => setConfirmOpen(true)}>
              {t('student.intro.startButton')}
            </Button>
          )}
        </div>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        titleId="start-confirm-title"
      >
        <h2 id="start-confirm-title" className="dialog__title">
          {t('student.intro.startConfirmTitle')}
        </h2>
        <p className="dialog__body">{t('student.intro.startConfirmBody')}</p>
        <div className="dialog__actions">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={starting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleStart} disabled={starting}>
            {t('student.intro.confirmStart')}
          </Button>
        </div>
      </Dialog>
    </MobileLayout>
  );
}
