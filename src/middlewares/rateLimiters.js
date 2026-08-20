import rateLimit from 'express-rate-limit';

import { env } from '../config/env.js';

const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.teste,
};

export const limiteGlobal = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: { erro: 'Muitas requisições. Tente de novo em alguns minutos.' },
});

export const limiteAutenticacao = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { erro: 'Muitas tentativas de acesso. Aguarde alguns minutos.' },
});

export const limiteRecompensa = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 30,
  message: { erro: 'Calma aí! Espere um instante antes de continuar.' },
});

export const limiteCompra = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 20,
  message: { erro: 'Muitas compras seguidas. Aguarde um instante.' },
});
