import { Router } from 'express';
import validate from '../../shared/validate.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { quizIdParamsSchema } from './quizzes.schemas.js';
import * as quizzesService from './quizzes.service.js';

const router = Router();

// Student-only for now; teacher/admin listings and CRUD are added in Phase 4.
router.get('/', requireAuth, requireRole('student'), (req, res) => {
  res.json({ quizzes: quizzesService.listForStudent(req.db, req.user) });
});

router.get(
  '/:quizId',
  requireAuth,
  requireRole('student'),
  validate(quizIdParamsSchema, 'params'),
  (req, res) => {
    const quiz = quizzesService.getQuizDetailForStudent(req.db, req.user, req.params.quizId);
    res.json({ quiz });
  },
);

export default router;
