import { Router } from 'express';
import validate from '../../shared/validate.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { attemptIdParamsSchema, resetReasonSchema } from './admin.schemas.js';
import * as adminService from './admin.service.js';
import importsRouter from '../imports/imports.routes.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/overview', (req, res) => {
  res.json(adminService.getOverview(req.db));
});

router.post(
  '/attempts/:attemptId/reset',
  validate(attemptIdParamsSchema, 'params'),
  validate(resetReasonSchema),
  (req, res) => {
    const result = adminService.resetAttempt(
      req.db,
      req.user,
      req.params.attemptId,
      req.body.reason,
    );
    res.json(result);
  },
);

router.use('/imports', importsRouter);

export default router;
