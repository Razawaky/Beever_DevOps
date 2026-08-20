import { emTransacao } from '../config/database.js';
import * as goalsRepository from '../repositories/goalsRepository.js';
import * as profilesRepository from '../repositories/profilesRepository.js';
import * as usersRepository from '../repositories/usersRepository.js';
import { erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as goalProgressSources from './goalProgressSources.js';
import * as schedulesService from './schedulesService.js';


const MINUTOS_DE_REFERENCIA = 10;

const TITULOS = {
  coin_balance: (alvo) => `Chegue a ${alvo} de mel`,
  user_level: (alvo) => `Chegue ao nível ${alvo}`,
};

function titularMeta(tipo, alvo) {
  const escritor = TITULOS[tipo.progress_source];
  return escritor ? escritor(alvo) : `${tipo.name}: chegue a ${alvo}`;
}

export function escolherPlano(regras, dias) {
  return (
    regras.find((regra) => dias >= Number(regra.min_weekdays) && dias <= Number(regra.max_weekdays)) ?? null
  );
}

export function calcularAlvo({ regraDeAlvo, valorAtual, dias, minutosPorSessao, diasDePrazo, repeticao = 1 }) {
  const semanas = diasDePrazo / 7;
  const sessoes = dias * semanas;
  const fatorDeTempo = minutosPorSessao / MINUTOS_DE_REFERENCIA;

  const bruto = Number(regraDeAlvo.base_per_session) * fatorDeTempo * sessoes * repeticao;
  const passo = Number(regraDeAlvo.rounding_step);
  const arredondado = Math.round(bruto / passo) * passo;

  const piso = Number(regraDeAlvo.min_increment) * repeticao;
  const teto = Number(regraDeAlvo.max_increment) * repeticao;
  const incremento = Math.min(teto, Math.max(piso, arredondado));

  return Number(valorAtual) + incremento;
}

async function montarPlano(idUsuario) {
  const [dias, perfil, regras, ativas] = await Promise.all([
    schedulesService.diasDisponiveis(idUsuario),
    profilesRepository.buscarPorUsuario(idUsuario),
    goalsRepository.listarRegrasDePlano(),
    goalsRepository.listarAtivasPorUsuario(idUsuario),
  ]);

  if (dias.length === 0) return { dias: 0, pedidas: 0, metas: [] };

  const plano = escolherPlano(regras, dias.length);
  if (!plano) throw erroValidacao(`Não há regra de plano de metas para ${dias.length} dia(s) na semana`);

  const pedidas = Number(plano.active_goals);
  const faltam = pedidas - ativas.length;
  if (faltam <= 0) return { dias: dias.length, pedidas, metas: [] };

  const mensuraveis = new Set(goalProgressSources.fontesMensuraveis());
  const candidatos = (await goalsRepository.listarRegrasDeAlvo()).filter((tipo) =>
    mensuraveis.has(tipo.progress_source),
  );
  if (candidatos.length === 0) return { dias: dias.length, pedidas, metas: [] };

  const minutosPorSessao = Number(perfil?.session_minutes ?? MINUTOS_DE_REFERENCIA);
  const diasDePrazo = Number(plano.default_days);
  const prazo = new Date(Date.now() + diasDePrazo * 24 * 60 * 60 * 1000);

  const usados = new Map();
  for (const meta of ativas) usados.set(meta.type_slug, (usados.get(meta.type_slug) ?? 0) + 1);

  const metas = [];
  for (let i = 0; i < faltam; i += 1) {
    const livres = candidatos.filter((tipo) => !usados.has(tipo.slug));
    const escolhido = sortear(livres.length > 0 ? livres : candidatos);
    const repeticao = (usados.get(escolhido.slug) ?? 0) + 1;
    usados.set(escolhido.slug, repeticao);

    const valorAtual = (await goalProgressSources.medir(escolhido.progress_source, idUsuario)) ?? 0;
    const alvo = calcularAlvo({
      regraDeAlvo: escolhido,
      valorAtual,
      dias: dias.length,
      minutosPorSessao,
      diasDePrazo,
      repeticao,
    });

    metas.push({
      idTipo: escolhido.goal_type_id,
      tipo: escolhido.slug,
      idDificuldade: plano.difficulty_id,
      dificuldade: plano.difficulty,
      titulo: titularMeta(escolhido, alvo),
      alvo,
      prazo,
      recompensaMoedas: Number(plano.reward_coins),
      recompensaPontos: Number(plano.reward_points),
    });
  }

  return { dias: dias.length, pedidas, plano, metas };
}

function sortear(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

export async function planoAtual(idUsuario) {
  const [dias, regras] = await Promise.all([
    schedulesService.diasDisponiveis(idUsuario),
    goalsRepository.listarRegrasDePlano(),
  ]);

  const plano = escolherPlano(regras, dias.length);
  if (!plano) return null;

  return {
    dias: dias.length,
    metasAtivas: Number(plano.active_goals),
    diasDePrazo: Number(plano.default_days),
    idDificuldade: plano.difficulty_id,
  };
}

export async function garantirMetasAtivas(idUsuario) {
  const plano = await montarPlano(idUsuario);
  if (plano.metas.length === 0) return { criadas: 0, metas: [], metasPedidas: plano.pedidas };

  const { criadas, metasCriadas } = await emTransacao(async (conexao) => {
    await usersRepository.travarPorId(conexao, idUsuario);

    const ativas = await goalsRepository.listarAtivasPorUsuario(idUsuario, conexao);
    const faltam = plano.pedidas - ativas.length;
    if (faltam <= 0) return { criadas: [], metasCriadas: [] };

    const aCriar = plano.metas.slice(0, faltam);
    const ids = [];
    for (const meta of aCriar) {
      ids.push(await goalsRepository.criar(conexao, { idUsuario, ...meta }));
    }
    return { criadas: ids, metasCriadas: aCriar };
  });

  for (let i = 0; i < criadas.length; i += 1) {
    const meta = metasCriadas[i];
    await auditService.registrar(auditService.usuario(idUsuario), 'meta.criada', {
      entidade: 'goal',
      id: criadas[i],
      depois: {
        origem: 'planejador',
        titulo: meta.titulo,
        alvo: meta.alvo,
        tipo: meta.tipo,
        dificuldade: meta.dificuldade,
        diasDisponiveis: plano.dias,
        recompensaMoedas: meta.recompensaMoedas,
        recompensaPontos: meta.recompensaPontos,
      },
    });
  }

  return { criadas: criadas.length, metas: metasCriadas, metasPedidas: plano.pedidas };
}
