import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../../components/layout/DashboardLayout.jsx';
import { LoadingState } from '../../../components/ui/LoadingState.jsx';
import { ErrorState } from '../../../components/ui/ErrorState.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Callout } from '../../../components/ui/Callout.jsx';
import { QuestionFormDialog } from '../components/QuestionFormDialog.jsx';
import { api } from '../../../api/client.js';
import { useT } from '../../../i18n/useT.js';
import { errorMessageKey } from '../../../lib/errorMessage.js';
import { toDateTimeLocalValue, fromDateTimeLocalValue } from '../../../lib/time.js';
import { getPublishChecklist } from '../publishChecklist.js';
import { OPTIONS_PER_QUESTION } from '../../../lib/constants.js';

function formFromQuiz(quiz) {
  return {
    title: quiz.title,
    language: quiz.language,
    timeLimitMinutes: quiz.timeLimitMinutes,
    opensAt: toDateTimeLocalValue(quiz.opensAt),
    closesAt: toDateTimeLocalValue(quiz.closesAt),
    negativeMarking: quiz.negativeMarking,
    penaltyRatio: quiz.penaltyRatio,
    classIds: quiz.classIds,
  };
}

export default function QuizEditorPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { t } = useT();

  const [status, setStatus] = useState('loading');
  const [loadErrorKey, setLoadErrorKey] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveErrorKey, setSaveErrorKey] = useState(null);
  const [saved, setSaved] = useState(false);

  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishErrorKey, setPublishErrorKey] = useState(null);

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteErrorKey, setDeleteErrorKey] = useState(null);

  function load() {
    setStatus('loading');
    Promise.all([api.get(`/quizzes/${quizId}`), api.get('/quizzes/classes')])
      .then(([quizData, classesData]) => {
        setQuiz(quizData.quiz);
        setForm(formFromQuiz(quizData.quiz));
        setClasses(classesData.classes);
        setStatus('ready');
      })
      .catch((error) => {
        setLoadErrorKey(errorMessageKey(error, { fallback: 'teacher.editor.errorLoading' }));
        setStatus('error');
      });
  }

  useEffect(load, [quizId]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function toggleClass(classId) {
    setForm((current) => ({
      ...current,
      classIds: current.classIds.includes(classId)
        ? current.classIds.filter((id) => id !== classId)
        : [...current.classIds, classId],
    }));
    setSaved(false);
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setSaveErrorKey(null);
    const body = quiz.locked
      ? { title: form.title, closesAt: fromDateTimeLocalValue(form.closesAt) }
      : {
          title: form.title,
          language: form.language,
          timeLimitMinutes: Number(form.timeLimitMinutes),
          opensAt: fromDateTimeLocalValue(form.opensAt),
          closesAt: fromDateTimeLocalValue(form.closesAt),
          negativeMarking: form.negativeMarking,
          penaltyRatio: Number(form.penaltyRatio),
          classIds: form.classIds,
        };
    try {
      const data = await api.put(`/quizzes/${quizId}`, body);
      setQuiz(data.quiz);
      setForm(formFromQuiz(data.quiz));
      setSaved(true);
    } catch (error) {
      setSaveErrorKey(errorMessageKey(error, { fallback: 'teacher.editor.errorGeneric' }));
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setPublishErrorKey(null);
    try {
      const data = await api.post(`/quizzes/${quizId}/publish`);
      setQuiz(data.quiz);
      setPublishConfirmOpen(false);
    } catch (error) {
      setPublishErrorKey(errorMessageKey(error, { fallback: 'teacher.editor.errorGeneric' }));
    } finally {
      setPublishing(false);
    }
  }

  function openAddQuestion() {
    setEditingQuestion(null);
    setQuestionDialogOpen(true);
  }

  function openEditQuestion(question) {
    setEditingQuestion(question);
    setQuestionDialogOpen(true);
  }

  function handleQuestionSaved() {
    setQuestionDialogOpen(false);
    load();
  }

  async function confirmDelete() {
    setDeleting(true);
    setDeleteErrorKey(null);
    try {
      await api.delete(`/quizzes/${quizId}/questions/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
    } catch (error) {
      setDeleteErrorKey(errorMessageKey(error, { fallback: 'teacher.editor.errorGeneric' }));
    } finally {
      setDeleting(false);
    }
  }

  if (status === 'loading') {
    return (
      <DashboardLayout title="">
        <LoadingState />
      </DashboardLayout>
    );
  }

  if (status === 'error' || !quiz) {
    return (
      <DashboardLayout title="">
        <ErrorState message={t(loadErrorKey)} onRetry={load} />
      </DashboardLayout>
    );
  }

  const checklist = getPublishChecklist(quiz);
  const canPublish = checklist.every((item) => item.ok);
  const isDraft = quiz.status === 'draft';
  const canEditQuestions = !quiz.locked;

  return (
    <DashboardLayout title={quiz.title}>
      <div className="editor-toolbar">
        <Button variant="secondary" onClick={() => navigate('/teacher')}>
          {t('teacher.editor.back')}
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/teacher/quizzes/${quizId}/results`)}>
          {t('teacher.editor.resultsLink')}
        </Button>
      </div>

      <div className="glass editor-panel">
        <h2 className="editor-panel__title">{t('teacher.editor.settingsTitle')}</h2>

        {quiz.locked && <Callout icon="🔒">{t('teacher.editor.lockedNotice')}</Callout>}

        <form className="form-grid" onSubmit={handleSave}>
          <label className="field">
            <span className="field__label">{t('teacher.quizFields.titleLabel')}</span>
            <input
              className="field__input"
              value={form.title}
              onChange={(event) => updateForm('title', event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">{t('teacher.quizFields.languageLabel')}</span>
            <select
              className="field__input"
              value={form.language}
              disabled={quiz.locked}
              onChange={(event) => updateForm('language', event.target.value)}
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
              disabled={quiz.locked}
              onChange={(event) => updateForm('timeLimitMinutes', event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">{t('teacher.quizFields.opensAtLabel')}</span>
            <input
              type="datetime-local"
              className="field__input"
              value={form.opensAt}
              disabled={quiz.locked}
              onChange={(event) => updateForm('opensAt', event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">{t('teacher.quizFields.closesAtLabel')}</span>
            <input
              type="datetime-local"
              className="field__input"
              value={form.closesAt}
              onChange={(event) => updateForm('closesAt', event.target.value)}
              required
            />
          </label>

          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={form.negativeMarking}
              disabled={quiz.locked}
              onChange={(event) => updateForm('negativeMarking', event.target.checked)}
            />
            <span className="field__label">{t('teacher.quizFields.negativeMarkingLabel')}</span>
          </label>

          {form.negativeMarking && (
            <label className="field">
              <span className="field__label">{t('teacher.quizFields.penaltyRatioLabel')}</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                className="field__input"
                value={form.penaltyRatio}
                disabled={quiz.locked}
                onChange={(event) => updateForm('penaltyRatio', event.target.value)}
              />
            </label>
          )}

          <fieldset className="field" disabled={quiz.locked}>
            <legend className="field__label">{t('teacher.quizFields.classesLabel')}</legend>
            <div className="checkbox-list">
              {classes.map((classOption) => (
                <label key={classOption.id} className="field--checkbox">
                  <input
                    type="checkbox"
                    checked={form.classIds.includes(classOption.id)}
                    onChange={() => toggleClass(classOption.id)}
                  />
                  {classOption.name}
                </label>
              ))}
            </div>
          </fieldset>

          {saveErrorKey && (
            <p className="form-error" role="alert">
              {t(saveErrorKey)}
            </p>
          )}
          {saved && <p className="save-status">{t('teacher.editor.savedNotice')}</p>}

          <div className="editor-panel__actions">
            <Button type="submit" disabled={saving}>
              {t('teacher.editor.saveButton')}
            </Button>
          </div>
        </form>
      </div>

      {isDraft && (
        <div className="glass editor-panel">
          <h2 className="editor-panel__title">{t('teacher.editor.publishChecklistTitle')}</h2>
          <ul className="checklist">
            {checklist.map((item) => (
              <li
                key={item.key}
                className={`checklist__item ${item.ok ? 'checklist__item--ok' : 'checklist__item--fail'}`}
              >
                {t(`teacher.editor.checklist.${item.key}`, { count: OPTIONS_PER_QUESTION })}
              </li>
            ))}
          </ul>
          {publishErrorKey && (
            <p className="form-error" role="alert">
              {t(publishErrorKey)}
            </p>
          )}
          <Button disabled={!canPublish} onClick={() => setPublishConfirmOpen(true)}>
            {t('teacher.editor.publishButton')}
          </Button>
        </div>
      )}

      <div className="glass editor-panel">
        <div className="editor-panel__header">
          <h2 className="editor-panel__title">
            {t('teacher.editor.questionsTitle', { count: quiz.questions.length })}
          </h2>
          {canEditQuestions && (
            <Button variant="secondary" onClick={openAddQuestion}>
              {t('teacher.editor.addQuestion')}
            </Button>
          )}
        </div>

        {quiz.questions.length === 0 ? (
          <EmptyState message={t('teacher.editor.noQuestions')} />
        ) : (
          <ul className="question-list">
            {quiz.questions.map((question, index) => (
              <li key={question.id} className="question-list__item">
                <div>
                  <p className="question-list__text">
                    {index + 1}. {question.text}
                  </p>
                  <p className="question-list__meta">
                    {question.options.map((option) => option.text).join(' · ')}
                  </p>
                </div>
                {canEditQuestions && (
                  <div className="question-list__actions">
                    <Button variant="secondary" onClick={() => openEditQuestion(question)}>
                      {t('teacher.editor.editQuestion')}
                    </Button>
                    <Button variant="danger" onClick={() => setDeleteTarget(question)}>
                      {t('teacher.editor.deleteQuestion')}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <QuestionFormDialog
        open={questionDialogOpen}
        onClose={() => setQuestionDialogOpen(false)}
        quizId={quizId}
        question={editingQuestion}
        onSaved={handleQuestionSaved}
      />

      <ConfirmDialog
        open={publishConfirmOpen}
        onClose={() => setPublishConfirmOpen(false)}
        titleId="publish-confirm-title"
        title={t('teacher.editor.publishConfirmTitle')}
        body={t('teacher.editor.publishConfirmBody')}
        confirmLabel={t('teacher.editor.publishConfirm')}
        busy={publishing}
        onConfirm={handlePublish}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        titleId="delete-question-title"
        title={t('teacher.editor.deleteConfirmTitle')}
        body={t('teacher.editor.deleteConfirmBody')}
        error={deleteErrorKey && t(deleteErrorKey)}
        confirmLabel={t('teacher.editor.deleteConfirm')}
        confirmVariant="danger"
        busy={deleting}
        onConfirm={confirmDelete}
      />
    </DashboardLayout>
  );
}
