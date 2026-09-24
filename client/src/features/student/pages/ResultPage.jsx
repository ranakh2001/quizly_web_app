import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MobileLayout } from '../../../components/layout/MobileLayout.jsx';
import { LoadingState } from '../../../components/ui/LoadingState.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { AnswerTile } from '../components/AnswerTile.jsx';
import { api } from '../../../api/client.js';
import { useT } from '../../../i18n/useT.js';
import { formatDateTime } from '../../../lib/time.js';

export default function ResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { t } = useT();
  const [status, setStatus] = useState('loading');
  const [view, setView] = useState(null);

  function load() {
    setStatus('loading');
    api
      .get(`/attempts/${attemptId}`)
      .then((data) => {
        if (data.attempt.status === 'in_progress') {
          navigate(`/student/attempts/${attemptId}`, { replace: true });
          return;
        }
        setView(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }

  useEffect(load, [attemptId, navigate]);

  if (status === 'loading') {
    return (
      <MobileLayout title={t('student.result.title')} onBack={() => navigate('/student')}>
        <LoadingState />
      </MobileLayout>
    );
  }

  if (status === 'error' || !view) {
    return (
      <MobileLayout title={t('student.result.title')} onBack={() => navigate('/student')}>
        <ErrorState message={t('student.result.errorLoading')} onRetry={load} />
      </MobileLayout>
    );
  }

  const { attempt, quiz, questions, answers, reviewUnlocked } = view;
  const answersByQuestionId = new Map(answers.map((a) => [a.questionId, a.optionId]));
  const quizDir = quiz.language === 'ar' ? 'rtl' : 'ltr';

  return (
    <MobileLayout title={t('student.result.title')} onBack={() => navigate('/student')}>
      <div className="glass result-score-card">
        <p className="result-score-card__label">{t('student.result.yourScore')}</p>
        <p className="result-score-card__value">
          {attempt.score}
          <span className="result-score-card__outof">
            {t('student.result.outOf', { maxScore: attempt.maxScore })}
          </span>
        </p>
        <p className="result-score-card__meta">
          {t('student.result.submittedAt', { time: formatDateTime(attempt.submittedAt) })}
        </p>
        {attempt.status === 'auto_submitted' && (
          <p className="result-score-card__meta">{t('student.result.statusAutoSubmitted')}</p>
        )}
      </div>

      {!reviewUnlocked && (
        <p className="intro-card__note">
          {t('student.result.reviewLocked', { time: formatDateTime(quiz.closesAt) })}
        </p>
      )}

      {reviewUnlocked && (
        <div dir={quizDir}>
          <h2 className="result-breakdown__title">{t('student.result.breakdownTitle')}</h2>
          {questions.map((question) => {
            const selectedOptionId = answersByQuestionId.get(question.id) ?? null;
            const selectedOption = question.options.find(
              (option) => option.id === selectedOptionId,
            );
            const correctOption = question.options.find((option) => option.isCorrect);
            const outcome = !selectedOption
              ? 'unanswered'
              : selectedOption.isCorrect
                ? 'correct'
                : 'wrong';
            const penalty = quiz.negativeMarking ? question.points * quiz.penaltyRatio : 0;
            const pointsLabel =
              outcome === 'correct'
                ? t('student.result.outcomeCorrect', { points: question.points })
                : outcome === 'wrong'
                  ? t('student.result.outcomeWrong', { points: -penalty })
                  : t('student.result.outcomeUnanswered');

            return (
              <div key={question.id} className="glass question-card result-breakdown__item">
                <p className="question-card__text">{question.text}</p>
                <p className={`result-breakdown__outcome result-breakdown__outcome--${outcome}`}>
                  {pointsLabel}
                </p>
                <div className="question-card__options">
                  {question.options.map((option) => (
                    <AnswerTile
                      key={option.id}
                      text={option.text}
                      selected={option.id === selectedOptionId}
                      disabled
                      outcome={
                        option.isCorrect
                          ? 'correct'
                          : option.id === selectedOptionId
                            ? 'wrong'
                            : undefined
                      }
                    />
                  ))}
                </div>
                {outcome === 'wrong' && correctOption && (
                  <p className="result-breakdown__correct-answer">
                    {t('student.result.correctAnswer', { text: correctOption.text })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Button variant="secondary" onClick={() => navigate('/student')}>
        {t('student.result.backToHome')}
      </Button>
    </MobileLayout>
  );
}
