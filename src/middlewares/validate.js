import { validationResult } from 'express-validator';

import { erroNaoEncontrado, erroValidacao } from '../utils/erros.js';

export function validate(req, res, next) {
  const resultado = validationResult(req);
  if (resultado.isEmpty()) return next();

  const detalhes = resultado.array().map((falha) => ({
    campo: falha.path,
    mensagem: falha.msg,
  }));

  next(erroValidacao('Verifique os campos preenchidos', detalhes));
}

export function validateEnderecoDePagina(req, res, next) {
  const resultado = validationResult(req);
  if (resultado.isEmpty()) return next();

  next(erroNaoEncontrado('Página não encontrada'));
}
