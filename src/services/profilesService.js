import { emTransacao } from '../config/database.js';
import { logger } from '../config/logger.js';
import * as profilesRepository from '../repositories/profilesRepository.js';
import * as usersRepository from '../repositories/usersRepository.js';
import { FUSO_PADRAO, fusoValido } from '../utils/diaDoJogador.js';
import { erroAcessoNegado, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';
import * as coinsService from './coinsService.js';
import * as goalPlannerService from './goalPlannerService.js';
import * as goalsService from './goalsService.js';
import * as levelsService from './levelsService.js';
import * as schedulesService from './schedulesService.js';


const MINUTOS_POR_SESSAO = [5, 10, 20, 30, 45];

const PREFERENCIAS = [
  { valor: 'som', rotulo: 'Quero ouvir os sons do jogo' },
  { valor: 'movimento-reduzido', rotulo: 'Prefiro menos animação na tela' },
];

export const PASSOS_DO_ONBOARDING = ['apelido', 'dias', 'tempo', 'objetivo', 'avatar', 'preferencias', 'nivel'];

const ERRO_SEM_DIAS = 'Escolha pelo menos um dia da semana para jogar';

function exigirMinutosValidos(minutos) {
  if (!MINUTOS_POR_SESSAO.includes(Number(minutos))) {
    throw erroValidacao(`Tempo por sessão inválido: ${minutos}. Use ${MINUTOS_POR_SESSAO.join(', ')}.`);
  }
  return Number(minutos);
}

function exigirDoCatalogo(opcoes, valor, mensagem) {
  const escolhido = String(valor ?? '').trim();
  if (!escolhido) throw erroValidacao(mensagem);

  if (!opcoes.some((opcao) => opcao.valor === escolhido)) {
    throw erroValidacao(`${mensagem}: "${escolhido}" não está entre as opções`);
  }
  return escolhido;
}

export async function obterCatalogoDoOnboarding() {
  const [avatares, objetivos] = await Promise.all([
    profilesRepository.listarAvatares(),
    profilesRepository.listarObjetivosIniciais(),
  ]);

  return {
    tempo: MINUTOS_POR_SESSAO.map((minutos) => ({ valor: String(minutos), rotulo: `${minutos} minutos` })),
    objetivo: objetivos.map((objetivo) => ({ valor: objetivo.slug, rotulo: objetivo.label })),
    avatar: avatares.map((avatar) => ({ valor: avatar.slug, rotulo: avatar.name, imagem: avatar.image_path })),
    preferencias: PREFERENCIAS,
  };
}

function lerPreferencias(resposta) {
  const marcadas = [].concat(resposta ?? [])
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);

  for (const marcada of marcadas) {
    if (!PREFERENCIAS.some((preferencia) => preferencia.valor === marcada)) {
      throw erroValidacao(`Preferência desconhecida: ${marcada}`);
    }
  }

  return {
    somAtivo: marcadas.includes('som'),
    animacaoReduzida: marcadas.includes('movimento-reduzido'),
  };
}

const ESCRITORES_DE_PASSO = {
  apelido: async ({ idUsuario }, resposta) => {
    const apelido = String(resposta ?? '').trim();
    if (!apelido) throw erroValidacao('Informe como quer ser chamado');
    await usersRepository.atualizar(idUsuario, { apelido });
  },
  dias: async ({ idUsuario }, resposta) => {
    const dias = [].concat(resposta ?? []).filter((dia) => dia !== '' && dia !== null && dia !== undefined);
    if (dias.length === 0) throw erroValidacao(ERRO_SEM_DIAS);
    await schedulesService.definirSemana(null, idUsuario, dias);
  },
  tempo: async ({ idPerfil }, resposta) => {
    await profilesRepository.atualizar(idPerfil, { minutosPorSessao: exigirMinutosValidos(resposta) });
  },
  objetivo: async ({ idPerfil, catalogo }, resposta) => {
    const objetivo = exigirDoCatalogo(catalogo.objetivo, resposta, 'Escolha um objetivo');
    await profilesRepository.atualizar(idPerfil, { objetivoInicial: objetivo });
  },
  avatar: async ({ idPerfil, catalogo }, resposta) => {
    const avatar = exigirDoCatalogo(catalogo.avatar, resposta, 'Escolha sua abelha');
    await profilesRepository.atualizar(idPerfil, { avatar });
  },
  preferencias: async ({ idPerfil }, resposta) => {
    await profilesRepository.atualizar(idPerfil, lerPreferencias(resposta));
  },
};

export async function obterDoUsuario(idUsuario) {
  const perfil = await profilesRepository.buscarDetalhadoPorUsuario(idUsuario);
  if (!perfil) throw erroNaoEncontrado('Perfil não encontrado');

  const [usuario, nivel, carteira] = await Promise.all([
    usersRepository.buscarPorId(idUsuario),
    levelsService.obterDoUsuario(idUsuario),
    coinsService.obterCarteira(idUsuario),
  ]);

  return {
    ...perfil,
    apelido: usuario?.nickname ?? null,
    email: usuario?.email ?? null,
    onboardingConcluido: Boolean(usuario?.onboarding_completed_at),
    nivel,
    mel: carteira.mel,
    polen: carteira.polen,
  };
}

export async function fusoDoUsuario(idUsuario) {
  const perfil = await profilesRepository.buscarPorUsuario(idUsuario);
  return fusoValido(perfil?.timezone ?? FUSO_PADRAO);
}

async function exigirPosse(idPerfil, idUsuario) {
  const perfil = await profilesRepository.buscarPorId(idPerfil);
  if (!perfil) throw erroNaoEncontrado('Perfil não encontrado');
  if (Number(perfil.user_id) !== Number(idUsuario)) throw erroAcessoNegado();
  return perfil;
}

export async function atualizar(
  idPerfil,
  idUsuario,
  { apelido, avatar, fuso, minutosPorSessao, somAtivo, animacaoReduzida },
) {
  const minutosInformados = minutosPorSessao !== undefined && minutosPorSessao !== null;
  if (minutosInformados) exigirMinutosValidos(minutosPorSessao);

  await exigirPosse(idPerfil, idUsuario);

  if (avatar !== undefined && avatar !== null) {
    const catalogo = await obterCatalogoDoOnboarding();
    exigirDoCatalogo(catalogo.avatar, avatar, 'Escolha sua abelha');
  }

  const anterior = await profilesRepository.buscarDetalhadoPorUsuario(idUsuario);
  const usuarioAnterior = await usersRepository.buscarPorId(idUsuario);

  if (apelido) await usersRepository.atualizar(idUsuario, { apelido });
  await profilesRepository.atualizar(idPerfil, { avatar, fuso, minutosPorSessao, somAtivo, animacaoReduzida });

  await auditService.registrar(auditService.usuario(idUsuario), 'perfil.atualizado', {
    entidade: 'profile',
    id: idPerfil,
    antes: { apelido: usuarioAnterior?.nickname, avatar: anterior?.avatar },
    depois: { apelido: apelido ?? usuarioAnterior?.nickname, avatar: avatar ?? anterior?.avatar },
  });

  return obterDoUsuario(idUsuario);
}

export async function atualizarDisponibilidade(idPerfil, idUsuario, dias) {
  const escolhidos = [].concat(dias ?? []).filter((dia) => dia !== '' && dia !== null && dia !== undefined);
  if (escolhidos.length === 0) throw erroValidacao(ERRO_SEM_DIAS);

  await exigirPosse(idPerfil, idUsuario);

  await goalsService.expirarVencidas(idUsuario);

  const antes = await schedulesService.diasDisponiveis(idUsuario);
  const metasAntes = await goalsService.listarAtivas(idUsuario);

  await emTransacao((conexao) => schedulesService.definirSemana(conexao, idUsuario, escolhidos));
  const depois = await schedulesService.diasDisponiveis(idUsuario);

  const planejadas = await goalPlannerService.garantirMetasAtivas(idUsuario);
  const metasDepois = await goalsService.listarAtivas(idUsuario);

  await auditService.registrar(auditService.usuario(idUsuario), 'perfil.disponibilidade-alterada', {
    entidade: 'profile',
    id: idPerfil,
    antes: { dias: antes, metasAtivas: metasAntes.length },
    depois: { dias: depois, metasAtivas: metasDepois.length, metasGeradas: planejadas.criadas },
  });

  return {
    dias: depois,
    metasAtivas: metasDepois.length,
    metasGeradas: planejadas.criadas,
    metasPedidas: Number(planejadas.metasPedidas),
    metasExcedentes: Math.max(0, metasDepois.length - Number(planejadas.metasPedidas)),
  };
}

export async function remover(idPerfil, idUsuario) {
  await exigirPosse(idPerfil, idUsuario);
  await profilesRepository.remover(idPerfil);

  await auditService.registrar(auditService.usuario(idUsuario), 'perfil.removido', {
    entidade: 'profile',
    id: idPerfil,
  });
}

export async function salvarOnboarding(
  idPerfil,
  idUsuario,
  { apelido, avatar, objetivo, nivel, dias = [], minutosPorSessao, preferencias },
) {
  if (dias.length === 0) throw erroValidacao(ERRO_SEM_DIAS);

  const catalogo = await obterCatalogoDoOnboarding();
  exigirDoCatalogo(catalogo.avatar, avatar, 'Escolha sua abelha');
  exigirDoCatalogo(catalogo.objetivo, objetivo, 'Escolha um objetivo');

  const minutosInformados = minutosPorSessao !== undefined && minutosPorSessao !== null;
  if (minutosInformados) exigirMinutosValidos(minutosPorSessao);
  const preferenciasMarcadas = preferencias === undefined ? null : lerPreferencias(preferencias);

  await exigirPosse(idPerfil, idUsuario);

  const saldoAntes = await auditService.retratoDoSaldo(idUsuario);

  const resultado = await emTransacao(async (conexao) => {
    if (apelido) await usersRepository.atualizar(idUsuario, { apelido }, conexao);
    await profilesRepository.atualizar(
      idPerfil,
      {
        avatar,
        objetivoInicial: objetivo,
        minutosPorSessao: minutosInformados ? Number(minutosPorSessao) : null,
        ...(preferenciasMarcadas ?? {}),
      },
      conexao,
    );

    const nivelInicial = await levelsService.definirPontoDePartida(conexao, idUsuario, nivel);
    const diasMarcados = await schedulesService.definirSemana(conexao, idUsuario, dias);

    await profilesRepository.avancarPasso(idPerfil, PASSOS_DO_ONBOARDING.length, conexao);
    await usersRepository.marcarOnboardingConcluido(idUsuario, conexao);

    return { nivelInicial, diasMarcados };
  });

  await auditService.registrar(auditService.usuario(idUsuario), 'onboarding.concluido', {
    entidade: 'profile',
    id: idPerfil,
    depois: {
      apelido,
      avatar,
      objetivo,
      nivelInicial: resultado.nivelInicial.nivel,
      diasDisponiveis: resultado.diasMarcados,
    },
  });

  await auditService.registrarRecompensa(auditService.usuario(idUsuario), 'xp.ponto-de-partida', {
    entidade: 'user_level',
    id: idUsuario,
    antes: saldoAntes,
    depois: await auditService.retratoDoSaldo(idUsuario),
    detalhes: { nivelEscolhido: nivel, nivelInicial: resultado.nivelInicial.nivel },
  });

  let metasGeradas = 0;
  try {
    const planejadas = await goalPlannerService.garantirMetasAtivas(idUsuario);
    metasGeradas = planejadas.criadas;
  } catch (erro) {
    logger.error({ erro, idUsuario }, 'Falha ao gerar as metas iniciais do onboarding');
  }

  return {
    apelido,
    avatar,
    objetivo,
    ...resultado.nivelInicial,
    diasDisponiveis: resultado.diasMarcados,
    metasGeradas,
  };
}

export async function salvarPassoDoOnboarding(idPerfil, idUsuario, { passo, resposta }) {
  const indice = PASSOS_DO_ONBOARDING.indexOf(passo);
  if (indice < 0) throw erroValidacao(`Passo de onboarding desconhecido: ${passo}`);

  const escritor = ESCRITORES_DE_PASSO[passo];
  if (!escritor) throw erroValidacao(`O passo "${passo}" é gravado ao concluir o onboarding`);

  await exigirPosse(idPerfil, idUsuario);
  const catalogo = await obterCatalogoDoOnboarding();
  await escritor({ idUsuario, idPerfil, catalogo }, resposta);
  await profilesRepository.avancarPasso(idPerfil, indice + 1);

  return obterRascunhoDoOnboarding(idUsuario);
}

export async function obterRascunhoDoOnboarding(idUsuario) {
  const perfil = await profilesRepository.buscarDetalhadoPorUsuario(idUsuario);
  if (!perfil) throw erroNaoEncontrado('Perfil não encontrado');

  const [usuario, dias, catalogo] = await Promise.all([
    usersRepository.buscarPorId(idUsuario),
    schedulesService.diasDisponiveis(idUsuario),
    obterCatalogoDoOnboarding(),
  ]);

  const respostas = {
    tempo: String(perfil.session_minutes),
    preferencias: [
      ...(perfil.is_sound_enabled ? ['som'] : []),
      ...(perfil.has_reduced_motion ? ['movimento-reduzido'] : []),
    ],
  };
  if (usuario?.nickname) respostas.apelido = usuario.nickname;
  if (dias.length > 0) respostas.dias = dias.map(String);
  if (perfil.objetivo_inicial) respostas.objetivo = perfil.objetivo_inicial;
  if (perfil.avatar) respostas.avatar = perfil.avatar;

  return {
    passos: PASSOS_DO_ONBOARDING,
    passoAtual: Number(perfil.onboarding_step),
    respostas,
    catalogo,
  };
}
