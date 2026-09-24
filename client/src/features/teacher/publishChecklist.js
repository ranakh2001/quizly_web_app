import { OPTIONS_PER_QUESTION } from '../../lib/constants.js';

// Mirrors server/src/domain/quizPublishing.js's rules, but as pass/fail checklist items
// (rather than per-question messages) so the editor can show it live, in the UI language,
// without ever displaying the server's hardcoded English error strings.
export function getPublishChecklist(quiz) {
  const questions = quiz.questions ?? [];
  const hasQuestions = questions.length > 0;

  return [
    {
      key: 'opensBeforeCloses',
      ok: new Date(quiz.opensAt).getTime() < new Date(quiz.closesAt).getTime(),
    },
    { key: 'atLeastOneClass', ok: quiz.classIds.length > 0 },
    { key: 'atLeastOneQuestion', ok: hasQuestions },
    { key: 'questionPoints', ok: hasQuestions && questions.every((q) => q.points > 0) },
    {
      key: 'questionOptions',
      ok: hasQuestions && questions.every((q) => q.options.length === OPTIONS_PER_QUESTION),
    },
    {
      key: 'questionCorrect',
      ok: hasQuestions && questions.every((q) => q.options.filter((o) => o.isCorrect).length === 1),
    },
  ];
}
