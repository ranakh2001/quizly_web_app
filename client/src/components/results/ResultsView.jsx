import { useEffect, useState } from 'react';
import { LoadingState } from '../ui/LoadingState.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Dialog } from '../ui/Dialog.jsx';
import { Button } from '../ui/Button.jsx';
import { api } from '../../api/client.js';
import { useT } from '../../i18n/useT.js';
import { errorMessageKey } from '../../lib/errorMessage.js';
import { formatCountdown } from '../../lib/time.js';

// Shared by the teacher Results screen and the admin Results screen (one table + per-
// question correct-rate view for both). Admin gets an extra Reset column/dialog via
// canReset; teacher never sees it, since only admin may reset an attempt (rule 2).
export function ResultsView({ quizId, canReset = false }) {
  const { t } = useT();
  const [status, setStatus] = useState('loading');
  const [data, setData] = useState(null);
  const [classId, setClassId] = useState('');
  const [classOptions, setClassOptions] = useState([]);
  const [errorKey, setErrorKey] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetReason, setResetReason] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetErrorKey, setResetErrorKey] = useState(null);

  function load() {
    setStatus('loading');
    const query = classId ? `?classId=${classId}` : '';
    api
      .get(`/quizzes/${quizId}/results${query}`)
      .then((result) => {
        setData(result);
        if (!classId) setClassOptions(buildClassOptions(result.students));
        setStatus('ready');
      })
      .catch((error) => {
        setErrorKey(errorMessageKey(error, { fallback: 'results.errorLoading' }));
        setStatus('error');
      });
  }

  useEffect(load, [quizId, classId]);

  function openReset(student) {
    setResetTarget(student);
    setResetReason('');
    setResetErrorKey(null);
  }

  async function confirmReset() {
    setResetting(true);
    setResetErrorKey(null);
    try {
      await api.post(`/admin/attempts/${resetTarget.attemptId}/reset`, {
        reason: resetReason.trim(),
      });
      setResetTarget(null);
      load();
    } catch (error) {
      setResetErrorKey(errorMessageKey(error, { fallback: 'results.resetErrorGeneric' }));
    } finally {
      setResetting(false);
    }
  }

  if (status === 'loading') return <LoadingState />;
  if (status === 'error') return <ErrorState message={t(errorKey)} onRetry={load} />;

  return (
    <div className="results-view">
      <div className="results-view__toolbar">
        {classOptions.length > 1 && (
          <label className="field results-view__filter">
            <span className="field__label">{t('results.classFilterLabel')}</span>
            <select
              className="field__input"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
            >
              <option value="">{t('results.allClasses')}</option>
              {classOptions.map((option) => (
                <option key={option.classId} value={option.classId}>
                  {option.className}
                </option>
              ))}
            </select>
          </label>
        )}
        <a
          className="button button--secondary results-view__export"
          href={`/api/quizzes/${quizId}/results/export${classId ? `?classId=${classId}` : ''}`}
          download
        >
          {t('results.exportCsv')}
        </a>
      </div>

      {data.students.length === 0 ? (
        <EmptyState message={t('results.empty')} />
      ) : (
        <div className="table-scroll glass">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('results.columnStudent')}</th>
                <th>{t('results.columnClass')}</th>
                <th>{t('results.columnStatus')}</th>
                <th>{t('results.columnScore')}</th>
                <th>{t('results.columnTime')}</th>
                {canReset && <th aria-hidden="true" />}
              </tr>
            </thead>
            <tbody>
              {data.students.map((student) => (
                <tr key={student.studentId}>
                  <td>{student.studentName}</td>
                  <td>{student.className}</td>
                  <td>{t(`results.status${statusKey(student.status)}`)}</td>
                  <td>{student.score !== null ? `${student.score} / ${student.maxScore}` : '—'}</td>
                  <td>
                    {student.timeTakenSeconds !== null
                      ? formatCountdown(student.timeTakenSeconds * 1000)
                      : '—'}
                  </td>
                  {canReset && (
                    <td>
                      {student.attemptId && (
                        <Button variant="secondary" onClick={() => openReset(student)}>
                          {t('results.resetButton')}
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="glass results-view__correct-rate">
        <h2 className="results-view__section-title">{t('results.correctRateTitle')}</h2>
        <ul className="correct-rate-list">
          {data.perQuestionCorrectRate.map((question, index) => (
            <li key={question.questionId} className="correct-rate-list__item">
              <span className="correct-rate-list__text">
                {index + 1}. {question.text}
              </span>
              <span className="correct-rate-list__value">
                {question.correctRate === null ? '—' : `${question.correctRate}%`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Dialog
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        titleId="reset-attempt-title"
      >
        <h2 id="reset-attempt-title" className="dialog__title">
          {t('results.resetDialogTitle')}
        </h2>
        <p className="dialog__body">{t('results.resetDialogBody')}</p>
        <label className="field">
          <span className="field__label">{t('results.resetReasonLabel')}</span>
          <textarea
            className="field__input"
            rows={3}
            value={resetReason}
            onChange={(event) => setResetReason(event.target.value)}
          />
        </label>
        {resetErrorKey && (
          <p className="form-error" role="alert">
            {t(resetErrorKey)}
          </p>
        )}
        <div className="dialog__actions">
          <Button variant="secondary" onClick={() => setResetTarget(null)} disabled={resetting}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={confirmReset}
            disabled={resetting || !resetReason.trim()}
          >
            {t('results.resetConfirm')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function buildClassOptions(students) {
  const byId = new Map();
  for (const student of students) {
    if (!byId.has(student.classId)) {
      byId.set(student.classId, { classId: student.classId, className: student.className });
    }
  }
  return [...byId.values()].sort((a, b) => a.className.localeCompare(b.className));
}

function statusKey(status) {
  return status
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}
