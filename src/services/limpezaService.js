import cron from 'node-cron';

import { logger } from '../config/logger.js';
import * as usersRepository from '../repositories/usersRepository.js';
import * as auditService from './auditService.js';


const DIAS_ATE_EXPURGO = 15;

const AGENDA_DIARIA = '0 0 * * *'; 

export async function expurgarContasInativas(dias = DIAS_ATE_EXPURGO) {
  const alvos = await usersRepository.listarInativosParaExpurgo(dias);
  if (alvos.length === 0) return { removidos: 0 };

  for (const usuario of alvos) {
    await auditService.registrar(auditService.sistema(), 'conta.expurgada', {
      entidade: 'user',
      id: usuario.id,
      antes: { apelido: usuario.nickname, email: usuario.email, diasInativo: dias },
    });
  }

  const removidos = await usersRepository.removerPorIds(alvos.map((usuario) => usuario.id));
  return { removidos };
}

export function agendarLimpezas() {
  return cron.schedule(AGENDA_DIARIA, async () => {
    try {
      const { removidos } = await expurgarContasInativas();
      logger.info({ removidos }, 'Expurgo de contas inativas concluído');
    } catch (erro) {
      logger.error({ erro }, 'Falha no expurgo de contas inativas');
    }
  });
}
