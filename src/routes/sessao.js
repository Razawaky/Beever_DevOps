import { Router } from 'express';
import { body } from 'express-validator';

import * as authController from '../controllers/authController.js';
import { limiteAutenticacao } from '../middlewares/rateLimiters.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

const regrasLogin = [
  body('email').trim().isEmail().withMessage('E-mail inválido').normalizeEmail(),
  body('senha').notEmpty().withMessage('Informe a senha'),
];

router.post('/login', limiteAutenticacao, regrasLogin, validate, authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/check', requireAuth, authController.sessaoAtual);

export default router;
