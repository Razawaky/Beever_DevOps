import { emTransacao } from '../config/database.js';
import * as gameSessionsRepository from '../repositories/gameSessionsRepository.js';
import * as inventoryRepository from '../repositories/inventoryRepository.js';
import * as itemsRepository from '../repositories/itemsRepository.js';
import * as streaksRepository from '../repositories/streaksRepository.js';
import { dataDoDia, diaDaSemana, diferencaEmDias, inicioDoDia, somarDias } from '../utils/diaDoJogador.js';
import * as achievementsService from './achievementsService.js';
import * as auditService from './auditService.js';
import * as profilesService from './profilesService.js';
import * as schedulesService from './schedulesService.js';


const MAXIMO_DE_DIAS_AVALIADOS = 60;

const ESCUDO = 'escudo-de-sequencia';
const MAXIMO_DE_ESCUDOS = 2;

const MARCOS = [7, 14, 30, 60, 100];

function paraMySQL(data) {
  return data.toISOString().slice(0, 19).replace('T', ' ');
}

function ehDiaMarcado(agenda, dataISO) {
  return agenda.length === 0 || agenda.includes(diaDaSemana(dataISO));
}

function desfechoDoDia(agenda, dia, cumpriu) {
  if (!ehDiaMarcado(agenda, dia)) return 'neutro';
  if (cumpriu) return 'cumprido';
  return 'perdido';
}

async function idDoEscudo() {
  const item = await itemsRepository.buscarPorSlug(ESCUDO);
  return item ? Number(item.id) : null;
}

export async function escudosDisponiveis(idUsuario) {
  const idItem = await idDoEscudo();
  if (!idItem) return 0;
  return inventoryRepository.contarAtivosDoItem(idUsuario, idItem);
}

export async function sincronizarEscudos(conexao, idUsuario) {
  const idItem = await idDoEscudo();
  if (!idItem) return 0;

  const emMaos = await inventoryRepository.contarAtivosDoItem(idUsuario, idItem, conexao);
  const guardados = Math.min(emMaos, MAXIMO_DE_ESCUDOS);

  await streaksRepository.criarSeNaoExistir(idUsuario, conexao);
  await streaksRepository.definirEscudos(conexao, idUsuario, guardados);
  return guardados;
}

async function consumirEscudo(idUsuario) {
  const idItem = await idDoEscudo();
  if (!idItem) return false;

  return emTransacao(async (conexao) => {
    const unidade = await inventoryRepository.bloquearUnidadeAtivaDoItem(conexao, idUsuario, idItem);
    if (!unidade) return false;

    const consumiu = await inventoryRepository.marcarComoConsumido(conexao, unidade.id);
    if (!consumiu) return false;

    await sincronizarEscudos(conexao, idUsuario);
    return true;
  });
}

async function agendaDoJogador(idUsuario) {
  const dias = await schedulesService.diasDisponiveis(idUsuario);
  return dias.map(Number);
}

function primeiroDiaNaoAvaliado(sequencia, hoje, fuso) {
  const referencia = sequencia.last_evaluated_at ?? sequencia.created_at;
  const dia = referencia ? dataDoDia(new Date(referencia), fuso) : hoje;
  const limite = somarDias(hoje, -MAXIMO_DE_DIAS_AVALIADOS);
  return diferencaEmDias(dia, limite) > 0 ? limite : dia;
}

function diasFechados(primeiroDia, hoje) {
  const dias = [];
  for (let dia = primeiroDia; diferencaEmDias(dia, hoje) > 0; dia = somarDias(dia, 1)) {
    dias.push(dia);
  }
  return dias;
}

async function diasComCelulaConcluida(idUsuario, primeiroDia, hoje, fuso) {
  const conclusoes = await gameSessionsRepository.listarConclusoesNoIntervalo(
    idUsuario,
    paraMySQL(inicioDoDia(primeiroDia, fuso)),
    paraMySQL(inicioDoDia(hoje, fuso)),
  );

  return new Set(conclusoes.map((linha) => dataDoDia(new Date(linha.finished_at), fuso)));
}

async function conferirMarco(idUsuario, diasAtuais) {
  if (!MARCOS.includes(diasAtuais)) return null;

  const { desbloqueou, melCreditado } = await achievementsService.desbloquear(idUsuario, `sequencia-${diasAtuais}`);
  return desbloqueou ? { dias: diasAtuais, melCreditado } : null;
}

export async function avaliar(idUsuario, agora = new Date()) {
  const fuso = await profilesService.fusoDoUsuario(idUsuario);
  const hoje = dataDoDia(agora, fuso);
  const sequencia = await streaksRepository.criarSeNaoExistir(idUsuario);

  const primeiroDia = primeiroDiaNaoAvaliado(sequencia, hoje, fuso);
  const dias = diasFechados(primeiroDia, hoje);

  let diasAtuais = Number(sequencia.current_days);
  let melhorDias = Number(sequencia.best_days);
  let ultimoDiaContado = sequencia.last_counted_date;
  let quebrou = false;
  const protegidos = [];
  const marcos = [];

  if (dias.length > 0) {
    const [agenda, cumpridos, jaAvaliados] = await Promise.all([
      agendaDoJogador(idUsuario),
      diasComCelulaConcluida(idUsuario, primeiroDia, hoje, fuso),
      streaksRepository.listarEventos(idUsuario, primeiroDia, hoje),
    ]);

    const comDesfecho = new Set(jaAvaliados.map((evento) => evento.data));

    for (const dia of dias) {
      if (comDesfecho.has(dia)) continue;

      let tipo = desfechoDoDia(agenda, dia, cumpridos.has(dia));

      if (tipo === 'perdido' && diasAtuais > 0 && (await consumirEscudo(idUsuario))) {
        tipo = 'protegido';
        protegidos.push(dia);
      }

      await streaksRepository.registrarEvento({ idUsuario, data: dia, tipo });

      if (tipo === 'cumprido') {
        diasAtuais += 1;
        ultimoDiaContado = dia;
        melhorDias = Math.max(melhorDias, diasAtuais);

        const marco = await conferirMarco(idUsuario, diasAtuais);
        if (marco) marcos.push(marco);
      }

      if (tipo === 'perdido' && diasAtuais > 0) {
        quebrou = true;
        diasAtuais = 0;
      }
    }
  }

  await streaksRepository.atualizar(idUsuario, {
    diasAtuais,
    melhorDias,
    ultimoDiaContado,
    avaliadoEm: paraMySQL(agora),
  });

  if (quebrou) {
    await auditService.registrar(auditService.sistema(), 'sequencia.quebrada', {
      entidade: 'streak',
      id: Number(sequencia.id),
      antes: { diasAtuais: Number(sequencia.current_days) },
      depois: { diasAtuais: 0 },
    });
  }

  for (const dia of protegidos) {
    await auditService.registrar(auditService.sistema(), 'sequencia.escudo-consumido', {
      entidade: 'streak',
      id: Number(sequencia.id),
      antes: { diaSalvo: dia, diasAtuais },
      depois: { escudosGuardados: await escudosDisponiveis(idUsuario) },
    });
  }

  return { diasAtuais, melhorDias, ultimoDiaContado, protegidos, marcos, hoje, fuso };
}

export async function registrarDiaCumprido(idUsuario, agora = new Date()) {
  const resumo = await avaliar(idUsuario, agora);
  const agenda = await agendaDoJogador(idUsuario);
  const marcado = ehDiaMarcado(agenda, resumo.hoje);

  const gravou = await streaksRepository.registrarEvento({
    idUsuario,
    data: resumo.hoje,
    tipo: marcado ? 'cumprido' : 'neutro',
  });

  if (!gravou || !marcado) return resumo;

  const diasAtuais = resumo.diasAtuais + 1;
  const melhorDias = Math.max(resumo.melhorDias, diasAtuais);

  await streaksRepository.atualizar(idUsuario, {
    diasAtuais,
    melhorDias,
    ultimoDiaContado: resumo.hoje,
    avaliadoEm: paraMySQL(agora),
  });

  const marco = await conferirMarco(idUsuario, diasAtuais);
  const marcos = marco ? [...resumo.marcos, marco] : resumo.marcos;

  return { ...resumo, diasAtuais, melhorDias, ultimoDiaContado: resumo.hoje, marcos };
}
