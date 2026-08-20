import * as usersService from '../services/usersService.js';
import { assincrono } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';
import { iniciarSessaoLogin } from '../utils/sessaoLogin.js';


export const listar = assincrono(async (req, res) => {
  res.json(await usersService.listar());
});

export const criar = assincrono(async (req, res) => {
  const { email, data_nasc: dataNasc, senha, apelido } = req.body;
  const consentimentoResponsavel = Boolean(req.body.consentimento_responsavel);

  const usuario = await usersService.criar({ email, dataNasc, senha, apelido, consentimentoResponsavel });

  await iniciarSessaoLogin(req, {
    usuarioId: usuario.id,
    email: usuario.email,
    ehAdmin: false,
    perfilId: usuario.idPerfil,
    onboardingConcluido: false,
  });

  if (querJson(req)) return res.status(201).json(usuario);
  res.redirect('/onboarding');
});

export const atualizar = assincrono(async (req, res) => {
  const { apelido, email, data_nasc: dataNasc, senha } = req.body;
  const atualizado = await usersService.atualizar(
    Number(req.params.id),
    { apelido, email, dataNasc, senha },
    { id: req.session.usuarioId, ehAdmin: req.session.ehAdmin },
  );
  res.json(atualizado);
});

export const inativar = assincrono(async (req, res) => {
  await usersService.inativar(Number(req.params.id), {
    id: req.session.usuarioId,
    ehAdmin: req.session.ehAdmin,
  });
  res.json({ mensagem: 'Conta inativada com sucesso' });
});
