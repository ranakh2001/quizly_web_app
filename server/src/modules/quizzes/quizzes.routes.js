import { Router } from 'express';
import validate from '../../shared/validate.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import {
  quizIdParamsSchema,
  questionParamsSchema,
  createQuizSchema,
  updateQuizSchema,
  questionInputSchema,
} from './quizzes.schemas.js';
import * as quizzesService from './quizzes.service.js';
import resultsRouter from '../results/results.routes.js';

const router = Router();

router.use(requireAuth, requireRole('student', 'teacher', 'admin'));

router.get('/', (req, res) => {
  if (req.user.role === 'student') {
    res.json({ quizzes: quizzesService.listForStudent(req.db, req.user) });
    return;
  }
  if (req.user.role === 'teacher') {
    res.json({ quizzes: quizzesService.listForTeacher(req.db, req.user) });
    return;
  }
  // Admin listing is added in Phase 5.
  res.json({ quizzes: [] });
});

router.post('/', requireRole('teacher'), validate(createQuizSchema), (req, res) => {
  const quiz = quizzesService.createQuiz(req.db, req.user, req.body);
  res.status(201).json({ quiz });
});

router.get('/:quizId', validate(quizIdParamsSchema, 'params'), (req, res) => {
  if (req.user.role === 'student') {
    res.json({ quiz: quizzesService.getQuizDetailForStudent(req.db, req.user, req.params.quizId) });
    return;
  }
  res.json({
    quiz: quizzesService.getQuizDetailForTeacherOrAdmin(req.db, req.user, req.params.quizId),
  });
});

router.put(
  '/:quizId',
  requireRole('teacher'),
  validate(quizIdParamsSchema, 'params'),
  validate(updateQuizSchema),
  (req, res) => {
    const quiz = quizzesService.updateQuiz(req.db, req.user, req.params.quizId, req.body);
    res.json({ quiz });
  },
);

router.post(
  '/:quizId/publish',
  requireRole('teacher'),
  validate(quizIdParamsSchema, 'params'),
  (req, res) => {
    const quiz = quizzesService.publishQuiz(req.db, req.user, req.params.quizId);
    res.json({ quiz });
  },
);

router.post(
  '/:quizId/questions',
  requireRole('teacher'),
  validate(quizIdParamsSchema, 'params'),
  validate(questionInputSchema),
  (req, res) => {
    const question = quizzesService.addQuestion(req.db, req.user, req.params.quizId, req.body);
    res.status(201).json({ question });
  },
);

router.put(
  '/:quizId/questions/:questionId',
  requireRole('teacher'),
  validate(questionParamsSchema, 'params'),
  validate(questionInputSchema),
  (req, res) => {
    const question = quizzesService.updateQuestion(
      req.db,
      req.user,
      req.params.quizId,
      req.params.questionId,
      req.body,
    );
    res.json({ question });
  },
);

router.delete(
  '/:quizId/questions/:questionId',
  requireRole('teacher'),
  validate(questionParamsSchema, 'params'),
  (req, res) => {
    quizzesService.deleteQuestion(req.db, req.user, req.params.quizId, req.params.questionId);
    res.status(204).end();
  },
);

router.use('/:quizId/results', resultsRouter);

export default router;
