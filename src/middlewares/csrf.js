import { randomBytes, timingSafeEqual } from 'node:crypto';

import { erroAcessoNegado } from '../utils/erros.js';

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrf(req, res, next) {
  if (!req.session) return next();

  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString('hex');
  }

  res.locals.csrfToken = req.session.csrfToken;

  if (METODOS_SEGUROS.has(req.method)) return next();

  const enviado = req.body?._csrf ?? req.get('x-csrf-token') ?? '';
  if (!tokensIguais(enviado, req.session.csrfToken)) {
    return next(erroAcessoNegado('Token CSRF inválido ou ausente'));
  }

  next();
}

function tokensIguais(a, b) {
  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
