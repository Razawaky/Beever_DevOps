import { Router } from 'express';
import { body, param } from 'express-validator';

import * as profilesController from '../controllers/profilesController.js';
import { limiteRecompensa } from '../middlewares/rateLimiters.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { requireOnboarding, requireOnboardingPendente } from '../middlewares/requireOnboarding.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

router.use(requireAuth);

router.get('/meu', profilesController.meu);

router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }),
    body('apelido').optional().trim().notEmpty().isLength({ max: 60 }),
    body('avatar').optional().trim().isLength({ max: 60 }),
    body('fuso').optional().trim().isLength({ max: 64 }),
    body('minutos_por_sessao')
      .optional()
      .custom((valor) => [5, 10, 20, 30, 45].includes(Number(valor)))
      .withMessage('Tempo por sessão inválido: use 5, 10, 20, 30 ou 45'),
    body('som_ativo').optional().isIn([true, false, 'true', 'false', 'on', '1', '0']),
    body('animacao_reduzida').optional().isIn([true, false, 'true', 'false', 'on', '1', '0']),
  ],
  validate,
  profilesController.atualizar,
);

router.put(
  '/:id/disponibilidade',
  requireOnboarding,
  limiteRecompensa,
  [
    param('id').isInt({ min: 1 }),
    body('dias').custom((valor) => {
      const lista = valor === undefined ? [] : [].concat(valor);
      if (lista.length === 0) throw new Error('Escolha pelo menos um dia da semana');
      return true;
    }),
    body('dias.*').isInt({ min: 0, max: 6 }).withMessage('Dia da semana inválido'),
  ],
  validate,
  profilesController.atualizarDisponibilidade,
);

router.delete('/:id', param('id').isInt({ min: 1 }), validate, profilesController.remover);

router.put(
  '/:id/onboarding/passo',
  requireOnboardingPendente,
  [
    param('id').isInt({ min: 1 }),
    body('passo').trim().notEmpty().withMessage('Informe qual passo está sendo salvo').isLength({ max: 40 }),
    body('resposta').exists().withMessage('Responda para continuar'),
  ],
  validate,
  profilesController.salvarPassoDoOnboarding,
);

router.put(
  '/:id/onboarding',
  requireOnboardingPendente,
  [
    param('id').isInt({ min: 1 }),
    body('apelido').trim().notEmpty().withMessage('Informe como quer ser chamado').isLength({ max: 60 }),
    body('avatar').trim().notEmpty().withMessage('Escolha sua abelha').isLength({ max: 60 }),
    body('objetivo').trim().notEmpty().withMessage('Escolha um objetivo'),
    body('tempo')
      .optional()
      .custom((valor) => [5, 10, 20, 30, 45].includes(Number(valor)))
      .withMessage('Tempo por sessão inválido: use 5, 10, 20, 30 ou 45'),
    body('preferencias.*').optional().isString().isLength({ max: 40 }),
    body('nivel')
      .isIn(['beginner', 'intermediate', 'advanced'])
      .withMessage('Nível inicial inválido'),
    body('dias').custom((valor) => {
      const lista = valor === undefined ? [] : [].concat(valor);
      if (lista.length === 0) throw new Error('Escolha pelo menos um dia da semana');
      return true;
    }),
    body('dias.*').optional().isInt({ min: 0, max: 6 }).withMessage('Dia da semana inválido'),
  ],
  validate,
  profilesController.salvarOnboarding,
);

export default router;
