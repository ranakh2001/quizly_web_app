import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MobileLayout } from '../../../components/layout/MobileLayout.jsx';
import { LoadingState } from '../../../components/ui/LoadingState.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Timer } from '../components/Timer.jsx';
import { AnswerTile } from '../components/AnswerTile.jsx';
import { QuestionNavigator } from '../components/QuestionNavigator.jsx';
import { SubmitSheet } from '../components/SubmitSheet.jsx';
import { TimesUpDialog } from '../components/TimesUpDialog.jsx';
import { useCountdown } from '../hooks/useCountdown.js';
import { api, ApiError } from '../../../api/client.js';
import { useT } from '../../../i18n/useT.js';

export default function TakingPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { t } = useT();

  const [status, setStatus] = useState('loading');
  const [view, setView] = useState(null); // { attempt, quiz, questions, serverNow }
  const [answersMap, setAnswersMap] = useState(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [submitSheetOpen, setSubmitSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timesUp, setTimesUp] = useState(false);
  const autoSubmitTriggered = useRef(false);

  const load = useCallback(() => {
    setStatus('loading');
    api
      .get(`/attempts/${attemptId}`)
      .then((data) => {
        if (data.attempt.status !== 'in_progress') {
          navigate(`/student/attempts/${attemptId}/result`, { replace: true });
          return;
        }
        setView(data);
        setAnswersMap(
          new Map(data.answers.filter((a) => a.optionId).map((a) => [a.questionId, a.optionId])),
        );
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [attemptId, navigate]);

  useEffect(load, [load]);

  const remainingMs = useCountdown(view?.attempt.deadline, view?.serverNow);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      await api.post(`/attempts/${attemptId}/submit`);
      navigate(`/student/attempts/${attemptId}/result`, { replace: true });
    } catch {
      // Submit is idempotent and tolerant server-side; if this somehow still fails, the
      // safest recovery is to reload the attempt and let the student see its real state.
      load();
      setSubmitting(false);
    }
  }, [attemptId, navigate, load]);

  useEffect(() => {
    if (!view || remainingMs > 0 || autoSubmitTriggered.current) return;
    autoSubmitTriggered.current = true;
    setTimesUp(true);
    handleSubmit();
  }, [remainingMs, view, handleSubmit]);

  async function selectOption(questionId, optionId) {
    setAnswersMap((prev) => new Map(prev).set(questionId, optionId));
    setSaveStatus('saving');
    try {
      await api.put(`/attempts/${attemptId}/answers/${questionId}`, { optionId });
      setSaveStatus('saved');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        load(); // deadline + grace already passed server-side; re-sync
        return;
      }
      setSaveStatus('offline');
    }
  }

  if (status === 'loading') {
    return (
      <MobileLayout title="" onBack={() => navigate('/student')}>
        <LoadingState />
      </MobileLayout>
    );
  }

  if (status === 'error' || !view) {
    return (
      <MobileLayout title="" onBack={() => navigate('/student')}>
        <ErrorState message={t('student.taking.errorLoading')} onRetry={load} />
      </MobileLayout>
    );
  }

  const { quiz, questions } = view;
  const currentQuestion = questions[currentIndex];
  const answeredQuestionIds = new Set(answersMap.keys());
  const unansweredCount = questions.length - answeredQuestionIds.size;
  const quizDir = quiz.language === 'ar' ? 'rtl' : 'ltr';

  return (
    <MobileLayout
      title={t('student.taking.questionOf', { current: currentIndex + 1, total: questions.length })}
      onBack={() => navigate('/student')}
    >
      <Timer remainingMs={remainingMs} />

      <QuestionNavigator
        questions={questions}
        answeredQuestionIds={answeredQuestionIds}
        currentIndex={currentIndex}
        onJump={setCurrentIndex}
      />

      <div className="glass question-card" dir={quizDir}>
        <p className="question-card__text">{currentQuestion.text}</p>
        <div className="question-card__options">
          {currentQuestion.options.map((option) => (
            <AnswerTile
              key={option.id}
              text={option.text}
              selected={answersMap.get(currentQuestion.id) === option.id}
              disabled={submitting}
              onSelect={() => selectOption(currentQuestion.id, option.id)}
            />
          ))}
        </div>
      </div>

      <p className="save-status" role="status">
        {saveStatus === 'saving' && t('student.taking.saveSaving')}
        {saveStatus === 'saved' && t('student.taking.saveSaved')}
        {saveStatus === 'offline' && t('student.taking.saveOffline')}
      </p>

      <div className="taking-nav-buttons">
        <Button
          variant="secondary"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
        >
          {t('student.taking.prev')}
        </Button>
        {currentIndex < questions.length - 1 ? (
          <Button
            onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))}
          >
            {t('student.taking.next')}
          </Button>
        ) : (
          <Button onClick={() => setSubmitSheetOpen(true)}>{t('student.taking.submit')}</Button>
        )}
      </div>

      <SubmitSheet
        open={submitSheetOpen}
        unansweredCount={unansweredCount}
        submitting={submitting}
        onCancel={() => setSubmitSheetOpen(false)}
        onConfirm={handleSubmit}
      />
      <TimesUpDialog open={timesUp} />
    </MobileLayout>
  );
}
