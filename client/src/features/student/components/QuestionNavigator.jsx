import { useT } from '../../../i18n/useT.js';

// Grid of question numbers so a student can jump straight to any question, coloured by
// whether it's been answered yet.
export function QuestionNavigator({ questions, answeredQuestionIds, currentIndex, onJump }) {
  const { t } = useT();

  return (
    <nav className="question-nav glass" aria-label={t('student.taking.navigatorTitle')}>
      {questions.map((question, index) => {
        const answered = answeredQuestionIds.has(question.id);
        const isCurrent = index === currentIndex;
        const classes = ['question-nav__item'];
        if (answered) classes.push('question-nav__item--answered');
        if (isCurrent) classes.push('question-nav__item--current');

        return (
          <button
            key={question.id}
            type="button"
            className={classes.join(' ')}
            aria-current={isCurrent}
            onClick={() => onJump(index)}
          >
            {index + 1}
          </button>
        );
      })}
    </nav>
  );
}
