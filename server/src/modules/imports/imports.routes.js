import { Router } from 'express';
import validate from '../../shared/validate.js';
import { uploadFileSchema } from './imports.schemas.js';
import * as importsService from './imports.service.js';

// Mounted under /api/admin, which already requires the admin role - see admin.routes.js.
const router = Router();

router.post('/students', validate(uploadFileSchema), async (req, res) => {
  const file = {
    buffer: Buffer.from(req.body.contentBase64, 'base64'),
    filename: req.body.filename,
  };
  const report = await importsService.importStudents(req.db, file);
  res.json({ report });
});

router.post('/teachers', validate(uploadFileSchema), async (req, res) => {
  const file = {
    buffer: Buffer.from(req.body.contentBase64, 'base64'),
    filename: req.body.filename,
  };
  const report = await importsService.importTeachers(req.db, file);
  res.json({ report });
});

export default router;
