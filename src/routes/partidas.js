import { Router } from 'express';
import { body, param } from 'express-validator';

import * as gameSessionsController from '../controllers/gameSessionsController.js';
import { limiteRecompensa } from '../middlewares/rateLimiters.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireOnboarding } from '../middlewares/requireOnboarding.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

router.use(requireAuth, requireOnboarding);

router.post(
  '/',
  limiteRecompensa,
  body('idCelula').isInt({ min: 1 }).withMessage('Célula inválida'),
  validate,
  gameSessionsController.abrir,
);

router.post(
  '/:token/resultado',
  limiteRecompensa,
  param('token').isUUID().withMessage('Partida inválida'),
  body('respostas').isArray({ max: 100 }).withMessage('As respostas precisam vir em lista'),
  validate,
  gameSessionsController.fechar,
);

router.put(
  '/:token/estado',
  param('token').isUUID().withMessage('Partida inválida'),
  body('respostas').isArray({ max: 100 }).withMessage('O progresso precisa vir em lista'),
  validate,
  gameSessionsController.salvarEstado,
);

router.post(
  '/:token/abandono',
  param('token').isUUID().withMessage('Partida inválida'),
  validate,
  gameSessionsController.abandonar,
);

export default router;
