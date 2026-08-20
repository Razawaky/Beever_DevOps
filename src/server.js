import { criarApp } from './app.js';
import { env } from './config/env.js';
import { fecharPool } from './config/database.js';
import { logger } from './config/logger.js';
import { fecharSessionStore } from './config/session.js';
import { agendarLimpezas } from './services/limpezaService.js';

const app = criarApp();

const servidor = app.listen(env.porta, () => {
  logger.info({ porta: env.porta, ambiente: env.ambiente }, 'Servidor Beever no ar');
});

const tarefasAgendadas = agendarLimpezas();

async function desligar(sinal) {
  logger.info({ sinal }, 'Desligando o servidor');
  servidor.close();
  await tarefasAgendadas.stop();

  try {
    await fecharSessionStore();
    await fecharPool();
    process.exit(0);
  } catch (erro) {
    logger.error({ erro }, 'Falha no desligamento');
    process.exit(1);
  }
}

process.on('SIGTERM', () => desligar('SIGTERM'));
process.on('SIGINT', () => desligar('SIGINT'));

process.on('unhandledRejection', (motivo) => {
  logger.error({ motivo }, 'Promise rejeitada sem tratamento');
});
