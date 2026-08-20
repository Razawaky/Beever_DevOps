import pino from 'pino';

import { idDaRequisicao } from './contextoRequisicao.js';
import { env } from './env.js';

export const logger = pino({
  level: env.teste ? 'silent' : env.log.nivel,
  base: { servico: 'beever' },
  mixin() {
    const requestId = idDaRequisicao();
    return requestId ? { requestId } : {};
  },
  redact: {
    paths: ['req.headers.cookie', 'req.body.senha', 'req.body.confirmarSenha', '*.senha'],
    remove: true,
  },
  transport: env.producao
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } },
});
