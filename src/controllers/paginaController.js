import { randomUUID } from 'node:crypto';

import * as contentService from '../services/contentService.js';
import * as goalPlannerService from '../services/goalPlannerService.js';
import * as goalsService from '../services/goalsService.js';
import * as inventoryService from '../services/inventoryService.js';
import * as itemsService from '../services/itemsService.js';
import * as profilesService from '../services/profilesService.js';
import * as schedulesService from '../services/schedulesService.js';
import * as streakService from '../services/streakService.js';
import * as tasksService from '../services/tasksService.js';
import { assincrono, erroNaoEncontrado } from '../utils/erros.js';
import { renderizarPagina } from '../utils/pagina.js';


const FUNDO_CERA = 'min-h-screen bg-cera text-tinta antialiased';

function redirecionarLogado(req, res) {
  res.redirect(req.session.onboardingConcluido ? '/painel' : '/onboarding');
}

export const login = (req, res) => {
  if (req.session?.usuarioId) return redirecionarLogado(req, res);
  renderizarPagina(res, 'login', { titulo: 'Entrar — Beever' });
};

export const cadastro = (req, res) => {
  if (req.session?.usuarioId) return redirecionarLogado(req, res);
  renderizarPagina(res, 'cadastro', {
    titulo: 'Criar conta — Beever',
    scripts: ['/js/cadastro.js'],
  });
};

export const onboarding = assincrono(async (req, res) => {
  const rascunho = await profilesService.obterRascunhoDoOnboarding(req.session.usuarioId);

  renderizarPagina(res, 'onboarding', {
    titulo: 'Configurar perfil — Beever',
    classeBody: 'flex min-h-screen flex-col items-center justify-center bg-cera p-4 text-tinta antialiased',
    dadosBody: {
      'perfil-id': req.session.perfilId,
      'csrf-token': res.locals.csrfToken,
      onboarding: JSON.stringify(rascunho),
    },
    scripts: ['/js/onboarding.js'],
  });
});

export const painel = assincrono(async (req, res) => {
  await streakService.avaliar(req.session.usuarioId);
  await tasksService.garantirTarefasDoDia(req.session.usuarioId);
  await tasksService.sincronizarProgresso(req.session.usuarioId);
  await goalsService.sincronizarProgresso(req.session.usuarioId);
  await goalPlannerService.garantirMetasAtivas(req.session.usuarioId);

  const [perfil, inventario, metas, tarefas] = await Promise.all([
    profilesService.obterDoUsuario(req.session.usuarioId),
    inventoryService.listarAgrupadoPorItem(req.session.usuarioId),
    goalsService.listarAtivas(req.session.usuarioId),
    tasksService.listarAtivas(req.session.usuarioId),
  ]);

  renderizarPagina(res, 'painel', {
    titulo: `${perfil.apelido} — Beever`,
    classeBody: 'min-h-screen bg-cera py-10 text-tinta antialiased',
    perfil,
    inventario,
    metaPrincipal: metas[0] ?? null,
    tarefas,
  });
});

export const loja = assincrono(async (req, res) => {
  const [perfil, itens, possuidos] = await Promise.all([
    profilesService.obterDoUsuario(req.session.usuarioId),
    itemsService.listarCatalogo(),
    inventoryService.idsPossuidos(req.session.usuarioId),
  ]);

  renderizarPagina(res, 'loja', {
    titulo: 'Loja — Beever',
    classeBody: FUNDO_CERA,
    perfil,
    itens,
    possuidos,
    chaveDeCompra: randomUUID(),
  });
});

export const metas = assincrono(async (req, res) => {
  await streakService.avaliar(req.session.usuarioId);
  await tasksService.garantirTarefasDoDia(req.session.usuarioId);
  await tasksService.sincronizarProgresso(req.session.usuarioId);
  await goalsService.sincronizarProgresso(req.session.usuarioId);
  await goalPlannerService.garantirMetasAtivas(req.session.usuarioId);

  const [listaDeMetas, tarefas] = await Promise.all([
    goalsService.listarDoUsuario(req.session.usuarioId),
    tasksService.listarDoUsuario(req.session.usuarioId),
  ]);

  renderizarPagina(res, 'metas', {
    titulo: 'Metas — Beever',
    classeBody: FUNDO_CERA,
    metas: listaDeMetas,
    tarefas,
  });
});

export const perfil = assincrono(async (req, res) => {
  await goalsService.sincronizarProgresso(req.session.usuarioId);
  await goalPlannerService.garantirMetasAtivas(req.session.usuarioId);

  const [dados, semana, metas] = await Promise.all([
    profilesService.obterDoUsuario(req.session.usuarioId),
    schedulesService.obterSemana(req.session.usuarioId),
    goalsService.listarAtivas(req.session.usuarioId),
  ]);

  renderizarPagina(res, 'perfil', {
    titulo: `${dados.apelido} — Beever`,
    classeBody: FUNDO_CERA,
    perfil: dados,
    semana,
    metas,
    dadosBody: { 'csrf-token': res.locals.csrfToken },
    scripts: ['/js/perfil.js'],
  });
});

export const trilha = assincrono(async (req, res) => {
  const trilha = await contentService.listarTrilha(req.session.usuarioId);
  const favoAtual = trilha.find((favo) => favo.estado === 'disponivel' && !favo.concluido) ?? null;

  renderizarPagina(res, 'trilha', {
    titulo: 'Minha trilha — Beever',
    classeBody: FUNDO_CERA,
    trilha,
    favoAtual,
  });
});

export const favo = assincrono(async (req, res) => {
  const { favo, celulas } = await contentService.listarCelulasDoFavo(req.session.usuarioId, Number(req.params.id));

  renderizarPagina(res, 'favo', {
    titulo: `${favo.title} — Beever`,
    classeBody: FUNDO_CERA,
    favo,
    celulas,
  });
});

const TELAS_DE_JOGO = {
  'quiz-do-favo': { areaDoJogo: 'quiz', script: '/js/quiz.js' },
  'arraste-e-classifique': { areaDoJogo: 'arraste', script: '/js/arraste.js' },
  'monte-o-orcamento': { areaDoJogo: 'orcamento', script: '/js/orcamento.js' },
  'cofre-do-tempo': { areaDoJogo: 'cofre', script: '/js/cofre.js' },
  'mercado-esperto': { areaDoJogo: 'mercado', script: '/js/mercado.js' },
  'ordene-a-prioridade': { areaDoJogo: 'ordene', script: '/js/ordene.js' },
};

export const celula = assincrono(async (req, res) => {
  const { celula } = await contentService.abrirCelula(req.session.usuarioId, Number(req.params.idCelula));
  const tela = TELAS_DE_JOGO[celula.game_type_slug];

  if (!tela) throw erroNaoEncontrado('Este jogo ainda não está disponível');

  renderizarPagina(res, 'celula', {
    titulo: `${celula.title} — Beever`,
    classeBody: FUNDO_CERA,
    celula,
    idFavo: Number(req.params.idFavo),
    areaDoJogo: tela.areaDoJogo,
    scripts: [tela.script],
    dadosBody: {
      'celula-id': Number(celula.id),
      'favo-id': Number(req.params.idFavo),
      'csrf-token': res.locals.csrfToken,
    },
  });
});

export const manutencao = (req, res) => {
  renderizarPagina(res, 'manutencao', {
    titulo: 'Em manutenção — Beever',
    classeBody: 'flex min-h-screen flex-col items-center justify-center bg-breu p-6 text-center antialiased',
  });
};
