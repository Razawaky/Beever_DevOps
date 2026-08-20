import { erroAcessoNegado, erroNaoAutorizado } from '../utils/erros.js';

export function requireAdmin(req, res, next) {
  if (!req.session?.usuarioId) return next(erroNaoAutorizado());
  if (!req.session.ehAdmin) return next(erroAcessoNegado('Área restrita a administradores'));
  next();
}
