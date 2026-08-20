import { AsyncLocalStorage } from 'node:async_hooks';

const armazenamento = new AsyncLocalStorage();

export function executarComContexto(contexto, callback) {
  return armazenamento.run(contexto, callback);
}

export function idDaRequisicao() {
  return armazenamento.getStore()?.requestId;
}

export function hashDoIpDaRequisicao() {
  return armazenamento.getStore()?.ipHash;
}
