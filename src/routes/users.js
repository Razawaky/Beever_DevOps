import { Router } from 'express';
import { body, param } from 'express-validator';

import * as usersController from '../controllers/usersController.js';
import { limiteAutenticacao } from '../middlewares/rateLimiters.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

const regrasCadastro = [
  body('apelido').trim().notEmpty().withMessage('Informe como você quer ser chamado').isLength({ max: 60 }),
  body('email').trim().isEmail().withMessage('E-mail inválido').normalizeEmail(),
  body('data_nasc').isISO8601().withMessage('Data de nascimento inválida'),
  body('senha')
    .isLength({ min: 8 })
    .withMessage('A senha precisa ter ao menos 8 caracteres')
    .matches(/[a-zA-Z]/)
    .withMessage('A senha precisa conter letras')
    .matches(/[0-9]/)
    .withMessage('A senha precisa conter números'),
  body('confirmarSenha')
    .optional()
    .custom((valor, { req }) => valor === req.body.senha)
    .withMessage('As senhas não coincidem'),
  body('consentimento_responsavel')
    .optional()
    .isIn(['on', 'true', '1', true, 'false', '0', false])
    .withMessage('Confirmação de responsável inválida'),
];

const regrasAtualizacao = [
  param('id').isInt({ min: 1 }),
  body('apelido').optional().trim().notEmpty().isLength({ max: 60 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('data_nasc').optional().isISO8601(),
  body('senha').optional().isLength({ min: 8 }).matches(/[a-zA-Z]/).matches(/[0-9]/),
];

router.get('/', requireAuth, requireAdmin, usersController.listar);

router.post('/', limiteAutenticacao, regrasCadastro, validate, usersController.criar);

router.put('/:id', requireAuth, regrasAtualizacao, validate, usersController.atualizar);

router.delete('/:id', requireAuth, param('id').isInt({ min: 1 }), validate, usersController.inativar);

export default router;
