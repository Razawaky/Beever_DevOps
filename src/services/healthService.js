import * as healthRepository from '../repositories/healthRepository.js';

export async function verificarSaude() {
  const inicio = process.hrtime.bigint();

  let bancoOk = false;
  let migrationsAplicadas = null;
  let detalheFalha = null;

  try {
    bancoOk = await healthRepository.ping();
    migrationsAplicadas = await healthRepository.contarMigrationsAplicadas();
  } catch (erro) {
    detalheFalha = erro.code ?? erro.message;
  }

  const latenciaMs = Number(process.hrtime.bigint() - inicio) / 1e6;

  return {
    status: bancoOk ? 'ok' : 'degradado',
    banco: {
      conectado: bancoOk,
      latenciaMs: Number(latenciaMs.toFixed(1)),
      migrationsAplicadas,
      ...(detalheFalha ? { falha: detalheFalha } : {}),
    },
    tempoAtivoSegundos: Math.round(process.uptime()),
  };
}
