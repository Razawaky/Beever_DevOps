import { erroNaoAutorizado } from '../utils/erros.js';

export function requireAuth(req, res, next) {
  if (req.session?.usuarioId) return next();
  next(erroNaoAutorizado());
}
