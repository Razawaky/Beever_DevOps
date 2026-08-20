import { querJson } from '../utils/resposta.js';

export function somentePagina(req, res, next) {
  if (querJson(req)) return next('route');
  next();
}
