import { Router } from 'express';
import validate from '../../shared/validate.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { quizIdParamsSchema, resultsQuerySchema } from '../quizzes/quizzes.schemas.js';
import * as resultsService from './results.service.js';

// Mounted with mergeParams under /api/quizzes/:quizId/results.
const router = Router({ mergeParams: true });

router.use(requireAuth, requireRole('teacher', 'admin'), validate(quizIdParamsSchema, 'params'));

router.get('/', validate(resultsQuerySchema, 'query'), (req, res) => {
  const results = resultsService.getResultsForQuiz(req.db, req.user, req.params.quizId, {
    classId: req.validatedQuery.classId,
  });
  res.json(results);
});

router.get('/export', validate(resultsQuerySchema, 'query'), (req, res) => {
  const results = resultsService.getResultsForQuiz(req.db, req.user, req.params.quizId, {
    classId: req.validatedQuery.classId,
  });
  const csv = resultsService.buildResultsCsv(results);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="quiz-${req.params.quizId}-results.csv"`);
  res.send(csv);
});

export default router;
