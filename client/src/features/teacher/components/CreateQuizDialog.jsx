import { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { api } from '../../../api/client.js';
import { useT } from '../../../i18n/useT.js';
import { errorMessageKey } from '../../../lib/errorMessage.js';
import { fromDateTimeLocalValue } from '../../../lib/time.js';

const DEFAULT_FORM = { title: '', language: 'ar', timeLimitMinutes: 20, opensAt: '', closesAt: '' };

// Only the fields a teacher needs to get a draft started; classes/negative marking are set
// afterwards in the editor, once the quiz exists (rule: classIds is optional at create time).
export function CreateQuizDialog({ open, onClose, onCreated }) {
  const { t } = useT();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState(null);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleClose() {
    setForm(DEFAULT_FORM);
    setErrorKey(null);
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setErrorKey(null);
    try {
      const data = await api.post('/quizzes', {
        title: form.title,
        language: form.language,
        timeLimitMinutes: Number(form.timeLimitMinutes),
        opensAt: fromDateTimeLocalValue(form.opensAt),
        closesAt: fromDateTimeLocalValue(form.closesAt),
      });
      setForm(DEFAULT_FORM);
      onCreated(data.quiz);
    } catch (error) {
      setErrorKey(errorMessageKey(error, { fallback: 'teacher.createDialog.errorGeneric' }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} titleId="create-quiz-title">
      <form onSubmit={handleSubmit}>
        <h2 id="create-quiz-title" className="dialog__title">
          {t('teacher.createDialog.title')}
        </h2>

        <div className="form-grid">
          <label className="field">
            <span className="field__label">{t('teacher.quizFields.titleLabel')}</span>
            <input
              className="field__input"
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">{t('teacher.quizFields.languageLabel')}</span>
            <select
              className="field__input"
              value={form.language}
              onChange={(event) => update('language', event.target.value)}
            >
              <option value="ar">{t('teacher.quizFields.languageAr')}</option>
              <option value="en">{t('teacher.quizFields.languageEn')}</option>
            </select>
          </label>

          <label className="field">
            <span className="field__label">{t('teacher.quizFields.timeLimitLabel')}</span>
            <input
              type="number"
              min="1"
              className="field__input"
              value={form.timeLimitMinutes}
              onChange={(event) => update('timeLimitMinutes', event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">{t('teacher.quizFields.opensAtLabel')}</span>
            <input
              type="datetime-local"
              className="field__input"
              value={form.opensAt}
              onChange={(event) => update('opensAt', event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">{t('teacher.quizFields.closesAtLabel')}</span>
            <input
              type="datetime-local"
              className="field__input"
              value={form.closesAt}
              onChange={(event) => update('closesAt', event.target.value)}
              required
            />
          </label>
        </div>

        {errorKey && (
          <p className="form-error" role="alert">
            {t(errorKey)}
          </p>
        )}

        <div className="dialog__actions">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting}>
            {t('teacher.createDialog.create')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
