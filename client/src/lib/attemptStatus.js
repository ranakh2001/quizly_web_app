// Converts the server's snake_case attempt status ("not_started", "in_progress", ...) to the
// camelCase key used under the attemptStatus.* i18n namespace ("notStarted", "inProgress").
// Shared by the student Home screen and the teacher/admin ResultsView table.
export function attemptStatusKey(status) {
  return status
    .split('_')
    .map((part, index) => (index === 0 ? part : part[0].toUpperCase() + part.slice(1)))
    .join('');
}
