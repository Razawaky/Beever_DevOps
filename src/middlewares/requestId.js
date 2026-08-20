import { createHash, randomUUID } from 'node:crypto';

import { executarComContexto } from '../config/contextoRequisicao.js';
import { env } from '../config/env.js';


const FORMATO_ACEITO = /^[A-Za-z0-9._-]{1,128}$/;

export const CABECALHO = 'x-request-id';

function anonimizarIp(ip) {
  if (!ip) return undefined;
  return createHash('sha256').update(`${env.sessao.segredo}:${ip}`).digest('hex');
}

export function requestId(req, res, next) {
  const recebido = req.headers[CABECALHO];
  const id = typeof recebido === 'string' && FORMATO_ACEITO.test(recebido) ? recebido : randomUUID();

  req.id = id;
  res.setHeader(CABECALHO, id);

  executarComContexto({ requestId: id, ipHash: anonimizarIp(req.ip) }, next);
}
