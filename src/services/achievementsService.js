import { emTransacao } from '../config/database.js';
import * as achievementsRepository from '../repositories/achievementsRepository.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';


export async function desbloquear(idUsuario, slug) {
  const conquista = await achievementsRepository.buscarPorSlug(slug);
  if (!conquista) return { desbloqueou: false, melCreditado: 0 };

  const saldoAntes = await auditService.retratoDoSaldo(idUsuario);
  const bonus = Number(conquista.reward_coins);

  const desbloqueou = await emTransacao(async (conexao) => {
    const primeiraVez = await achievementsRepository.desbloquear(conexao, {
      idUsuario,
      idConquista: conquista.id,
    });
    if (!primeiraVez) return false;

    if (bonus > 0) {
      await coinsService.creditar(conexao, idUsuario, bonus, {
        motivo: 'marco-de-sequencia',
        referenciaTipo: 'achievement',
        referenciaId: Number(conquista.id),
      });
    }
    return true;
  });

  if (!desbloqueou) return { desbloqueou: false, melCreditado: 0 };

  await auditService.registrarRecompensa(auditService.usuario(idUsuario), 'conquista.desbloqueada', {
    entidade: 'achievement',
    id: Number(conquista.id),
    antes: saldoAntes,
    depois: await auditService.retratoDoSaldo(idUsuario),
    detalhes: { conquista: conquista.slug, melBonus: bonus },
  });

  return { desbloqueou: true, melCreditado: bonus, conquista };
}

export async function listarDoUsuario(idUsuario) {
  return achievementsRepository.listarDoUsuario(idUsuario);
}
