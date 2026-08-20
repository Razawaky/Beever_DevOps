import { Router } from 'express';
import { param } from 'express-validator';

import * as tasksController from '../controllers/tasksController.js';
import { limiteRecompensa } from '../middlewares/rateLimiters.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireOnboarding } from '../middlewares/requireOnboarding.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

router.use(requireAuth, requireOnboarding);

router.get('/', tasksController.listar);

router.post(
  '/:id/concluir',
  limiteRecompensa,
  param('id').isInt({ min: 1 }),
  validate,
  tasksController.concluir,
);

export default router;
