import { Router } from 'express';
import { param } from 'express-validator';

import * as healthController from '../controllers/healthController.js';
import * as homeController from '../controllers/homeController.js';
import * as paginaController from '../controllers/paginaController.js';
import { requireOnboarding, requireOnboardingPendente } from '../middlewares/requireOnboarding.js';
import { somentePagina } from '../middlewares/somentePagina.js';
import { validateEnderecoDePagina } from '../middlewares/validate.js';
import lojaRouter from './loja.js';
import metasRouter from './metas.js';
import partidasRouter from './partidas.js';
import perfilRouter from './perfil.js';
import sessaoRouter from './sessao.js';
import tarefasRouter from './tarefas.js';
import usersRouter from './users.js';

const router = Router();

router.get('/', homeController.mostrar);
router.get('/health', healthController.mostrar);

router.get('/login', paginaController.login);
router.get('/cadastro', paginaController.cadastro);
router.get('/onboarding', requireOnboardingPendente, paginaController.onboarding);
router.get('/painel', requireOnboarding, paginaController.painel);
router.get('/loja', somentePagina, requireOnboarding, paginaController.loja);
router.get('/metas', somentePagina, requireOnboarding, paginaController.metas);
router.get('/perfil', somentePagina, requireOnboarding, paginaController.perfil);
router.get('/trilha', requireOnboarding, paginaController.trilha);
router.get(
  '/trilha/:id',
  requireOnboarding,
  param('id').isInt({ min: 1 }),
  validateEnderecoDePagina,
  paginaController.favo,
);
router.get(
  '/trilha/:idFavo/celula/:idCelula',
  requireOnboarding,
  param('idFavo').isInt({ min: 1 }),
  param('idCelula').isInt({ min: 1 }),
  validateEnderecoDePagina,
  paginaController.celula,
);
router.get('/manutencao', paginaController.manutencao);

router.use('/users', usersRouter);
router.use('/perfil', perfilRouter);
router.use('/sessao', sessaoRouter);
router.use('/loja', lojaRouter);
router.use('/metas', metasRouter);
router.use('/partidas', partidasRouter);
router.use('/tarefas', tarefasRouter);

export default router;
