import * as profilesService from '../services/profilesService.js';
import { assincrono } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';

export const meu = assincrono(async (req, res) => {
  res.json(await profilesService.obterDoUsuario(req.session.usuarioId));
});

function booleano(valor) {
  if (valor === undefined) return undefined;
  return valor !== false && valor !== 'false' && valor !== '0' && valor !== 0;
}

export const atualizar = assincrono(async (req, res) => {
  const {
    apelido,
    avatar,
    fuso,
    minutos_por_sessao: minutosPorSessao,
    som_ativo: somAtivo,
    animacao_reduzida: animacaoReduzida,
  } = req.body;

  const perfil = await profilesService.atualizar(Number(req.params.id), req.session.usuarioId, {
    apelido,
    avatar,
    fuso,
    minutosPorSessao: minutosPorSessao === undefined ? undefined : Number(minutosPorSessao),
    somAtivo: booleano(somAtivo),
    animacaoReduzida: booleano(animacaoReduzida),
  });
  res.json(perfil);
});

export const atualizarDisponibilidade = assincrono(async (req, res) => {
  const dias = req.body.dias === undefined ? [] : [].concat(req.body.dias);
  const resultado = await profilesService.atualizarDisponibilidade(
    Number(req.params.id),
    req.session.usuarioId,
    dias,
  );

  if (querJson(req)) return res.json({ mensagem: 'Disponibilidade atualizada', ...resultado });
  res.redirect('/perfil');
});

export const remover = assincrono(async (req, res) => {
  await profilesService.remover(Number(req.params.id), req.session.usuarioId);
  res.json({ mensagem: 'Perfil removido com sucesso' });
});

export const salvarPassoDoOnboarding = assincrono(async (req, res) => {
  const rascunho = await profilesService.salvarPassoDoOnboarding(Number(req.params.id), req.session.usuarioId, {
    passo: req.body.passo,
    resposta: req.body.resposta,
  });
  res.json(rascunho);
});

export const salvarOnboarding = assincrono(async (req, res) => {
  const { apelido, avatar, objetivo, nivel, tempo } = req.body;
  const dias = req.body.dias === undefined ? [] : [].concat(req.body.dias);
  const preferencias = req.body.preferencias === undefined ? undefined : [].concat(req.body.preferencias);

  const resultado = await profilesService.salvarOnboarding(Number(req.params.id), req.session.usuarioId, {
    apelido,
    avatar,
    objetivo,
    nivel,
    dias,
    minutosPorSessao: tempo === undefined ? undefined : Number(tempo),
    preferencias,
  });
  req.session.onboardingConcluido = true;

  if (querJson(req)) return res.json({ mensagem: 'Onboarding salvo com sucesso', ...resultado });
  res.redirect('/painel');
});
