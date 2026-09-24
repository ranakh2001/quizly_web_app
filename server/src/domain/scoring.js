import { DEFAULT_PENALTY_RATIO } from '../constants.js';

// Rule: correct = +points; wrong = 0, or -(points * penaltyRatio) if negative marking is on;
// unanswered = 0 always; total floored at 0; max = sum of points.
// questions: [{ id, points }]. answers: [{ questionId, isCorrect }] (unanswered questions
// simply have no entry). Pure function, no DB/Express - reused by seed.js and the attempts
// service so scoring is computed in exactly one place.
export function scoreAttempt({
  questions,
  answers,
  negativeMarking,
  penaltyRatio = DEFAULT_PENALTY_RATIO,
}) {
  const answerByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer]));

  let rawScore = 0;
  let maxScore = 0;
  const breakdown = [];

  for (const question of questions) {
    maxScore += question.points;
    const answer = answerByQuestionId.get(question.id);

    if (!answer) {
      breakdown.push({ questionId: question.id, outcome: 'unanswered', pointsAwarded: 0 });
      continue;
    }

    if (answer.isCorrect) {
      rawScore += question.points;
      breakdown.push({
        questionId: question.id,
        outcome: 'correct',
        pointsAwarded: question.points,
      });
      continue;
    }

    const penalty = negativeMarking ? question.points * penaltyRatio : 0;
    rawScore -= penalty;
    breakdown.push({ questionId: question.id, outcome: 'wrong', pointsAwarded: -penalty });
  }

  return { score: Math.max(0, rawScore), maxScore, breakdown };
}
