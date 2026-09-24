import { Router } from 'express';
import validate from '../../shared/validate.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import {
  startAttemptSchema,
  attemptIdParamsSchema,
  answerParamsSchema,
  saveAnswerSchema,
} from './attempts.schemas.js';
import * as attemptsService from './attempts.service.js';

const router = Router();

router.use(requireAuth, requireRole('student'));

// The student Results page: every finalised attempt, newest first.
router.get('/', (req, res) => {
  res.json({ attempts: attemptsService.listAttemptsForStudent(req.db, req.user) });
});

// Idempotent: creates a new attempt or returns the existing one for (quizId, student).
router.post('/', validate(startAttemptSchema), (req, res) => {
  const view = attemptsService.startAttempt(req.db, req.user, req.body.quizId);
  res.status(201).json(view);
});

router.get('/:attemptId', validate(attemptIdParamsSchema, 'params'), (req, res) => {
  const view = attemptsService.getAttemptForStudent(req.db, req.user, req.params.attemptId);
  res.json(view);
});

router.put(
  '/:attemptId/answers/:questionId',
  validate(answerParamsSchema, 'params'),
  validate(saveAnswerSchema, 'body'),
  (req, res) => {
    const result = attemptsService.saveAnswer(
      req.db,
      req.user,
      req.params.attemptId,
      req.params.questionId,
      req.body.optionId,
    );
    res.json(result);
  },
);

router.post('/:attemptId/submit', validate(attemptIdParamsSchema, 'params'), (req, res) => {
  const view = attemptsService.submitAttempt(req.db, req.user, req.params.attemptId);
  res.json(view);
});

export default router;
