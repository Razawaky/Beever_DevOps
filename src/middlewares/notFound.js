import { erroNaoEncontrado } from '../utils/erros.js';

export function notFound(req, res, next) {
  next(erroNaoEncontrado(`Página não encontrada: ${req.method} ${req.originalUrl}`));
}
