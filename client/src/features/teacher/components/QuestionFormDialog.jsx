import { useEffect, useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { api } from '../../../api/client.js';
import { useT } from '../../../i18n/useT.js';
import { errorMessageKey } from '../../../lib/errorMessage.js';
import { OPTIONS_PER_QUESTION } from '../../../lib/constants.js';

function blankOptions() {
  return Array.from({ length: OPTIONS_PER_QUESTION }, () => ({ text: '', isCorrect: false }));
}

// Add/edit a question. `question` is null to add, or an existing {id, text, points, options}
// to edit - both cases share this one form, per quiz rule: always exactly OPTIONS_PER_QUESTION
// options with exactly one marked correct.
export function QuestionFormDialog({ open, onClose, quizId, question, onSaved }) {
  const { t } = useT();
  const [text, setText] = useState('');
  const [points, setPoints] = useState(1);
  const [options, setOptions] = useState(blankOptions());
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (question) {
      setText(question.text);
      setPoints(question.points);
      setOptions(
        question.options.map((option) => ({ text: option.text, isCorrect: option.isCorrect })),
      );
    } else {
      setText('');
      setPoints(1);
      setOptions(blankOptions());
    }
    setErrorKey(null);
  }, [open, question]);

  function updateOptionText(index, value) {
    setOptions((current) =>
      current.map((option, i) => (i === index ? { ...option, text: value } : option)),
    );
  }

  function setCorrectIndex(index) {
    setOptions((current) => current.map((option, i) => ({ ...option, isCorrect: i === index })));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setErrorKey(null);
    const body = { text, points: Number(points), options };
    try {
      const saved = question
        ? await api.put(`/quizzes/${quizId}/questions/${question.id}`, body)
        : await api.post(`/quizzes/${quizId}/questions`, body);
      onSaved(saved.question);
    } catch (error) {
      setErrorKey(errorMessageKey(error, { fallback: 'teacher.questionForm.errorGeneric' }));
    } finally {
      setSubmitting(false);
    }
  }

  const hasCorrectOption = options.some((option) => option.isCorrect);
  const allOptionsFilled = options.every((option) => option.text.trim().length > 0);

  return (
    <Dialog open={open} onClose={onClose} titleId="question-form-title">
      <form onSubmit={handleSubmit}>
        <h2 id="question-form-title" className="dialog__title">
          {question ? t('teacher.questionForm.editTitle') : t('teacher.questionForm.addTitle')}
        </h2>

        <label className="field">
          <span className="field__label">{t('teacher.questionForm.textLabel')}</span>
          <textarea
            className="field__input"
            rows={2}
            value={text}
            onChange={(event) => setText(event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="field__label">{t('teacher.questionForm.pointsLabel')}</span>
          <input
            type="number"
            min="1"
            className="field__input"
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            required
          />
        </label>

        <div className="option-form-list">
          {options.map((option, index) => (
            <div className="option-form-list__row" key={index}>
              <input
                type="radio"
                name="correct-option"
                aria-label={t('teacher.questionForm.correctLabel')}
                checked={option.isCorrect}
                onChange={() => setCorrectIndex(index)}
              />
              <input
                className="field__input"
                value={option.text}
                placeholder={t('teacher.questionForm.optionLabel', { n: index + 1 })}
                onChange={(event) => updateOptionText(index, event.target.value)}
                required
              />
            </div>
          ))}
        </div>

        {errorKey && (
          <p className="form-error" role="alert">
            {t(errorKey)}
          </p>
        )}

        <div className="dialog__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting || !hasCorrectOption || !allOptionsFilled}>
            {t('teacher.questionForm.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
