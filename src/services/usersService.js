import bcrypt from 'bcrypt';

import { hashDoIpDaRequisicao } from '../config/contextoRequisicao.js';
import { emTransacao } from '../config/database.js';
import * as guardianConsentsRepository from '../repositories/guardianConsentsRepository.js';
import * as profilesRepository from '../repositories/profilesRepository.js';
import * as userLevelsRepository from '../repositories/userLevelsRepository.js';
import * as usersRepository from '../repositories/usersRepository.js';
import * as walletsRepository from '../repositories/walletsRepository.js';
import { ErroAplicacao, erroAcessoNegado, erroNaoEncontrado, erroValidacao } from '../utils/erros.js';
import * as auditService from './auditService.js';


const CUSTO_BCRYPT = 10;

function quemAgiu(ator) {
  return ator.ehAdmin ? auditService.admin(ator.id) : auditService.usuario(ator.id);
}

function exigirPosse(idAlvo, ator) {
  if (ator?.ehAdmin) return;
  if (Number(ator?.id) !== Number(idAlvo)) throw erroAcessoNegado('Você só pode alterar a sua própria conta');
}

export function senhaValida(senha) {
  return typeof senha === 'string' && senha.length >= 8 && /[a-zA-Z]/.test(senha) && /[0-9]/.test(senha);
}

function exigirSenhaValida(senha) {
  if (!senhaValida(senha)) {
    throw erroValidacao('A senha precisa ter ao menos 8 caracteres, com letras e números');
  }
}

const MAIORIDADE = 18;

export function idadeEm(dataNasc, referencia = new Date()) {
  const nascimento = new Date(dataNasc);
  let idade = referencia.getFullYear() - nascimento.getFullYear();
  const passouAniversario =
    referencia.getMonth() > nascimento.getMonth() ||
    (referencia.getMonth() === nascimento.getMonth() && referencia.getDate() >= nascimento.getDate());
  if (!passouAniversario) idade -= 1;
  return idade;
}

export function faixaParaIdade(faixas, idade) {
  const exata = faixas.find((faixa) => idade >= faixa.min_age && idade <= faixa.max_age);
  if (exata) return exata;
  return idade < faixas[0].min_age ? faixas[0] : faixas[faixas.length - 1];
}

export async function listar() {
  return usersRepository.listar();
}

export async function obter(id) {
  const usuario = await usersRepository.buscarPorId(id);
  if (!usuario) throw erroNaoEncontrado('Usuário não encontrado');
  return usuario;
}

export async function criar({ email, dataNasc, senha, apelido, consentimentoResponsavel = false }) {
  exigirSenhaValida(senha);

  const apelidoLimpo = apelido?.trim();
  if (!apelidoLimpo) throw erroValidacao('Informe como você quer ser chamado');

  const idade = idadeEm(dataNasc);
  const precisaDeConsentimento = idade < MAIORIDADE;

  if (precisaDeConsentimento && !consentimentoResponsavel) {
    throw new ErroAplicacao(
      'É preciso que um responsável autorize a criação desta conta',
      { status: 422, codigo: 'CONSENTIMENTO_NECESSARIO' },
    );
  }

  if (await usersRepository.emailJaUsado(email)) {
    throw new ErroAplicacao('Este e-mail já está cadastrado', { status: 409, codigo: 'EMAIL_EM_USO' });
  }

  const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);
  const faixas = await profilesRepository.listarFaixasEtarias();
  const faixa = faixaParaIdade(faixas, idade);

  const { idUsuario, idPerfil } = await emTransacao(async (conexao) => {
    const usuario = await usersRepository.criar({ email, apelido: apelidoLimpo, dataNasc, senhaHash }, conexao);
    const perfil = await profilesRepository.criar({ idUsuario: usuario }, conexao);
    await walletsRepository.criar(usuario, conexao);
    await userLevelsRepository.criar(usuario, conexao);

    if (precisaDeConsentimento) {
      await guardianConsentsRepository.registrar(conexao, {
        idUsuario: usuario,
        emailResponsavel: email,
        ipHash: hashDoIpDaRequisicao() ?? null,
      });
    }

    return { idUsuario: usuario, idPerfil: perfil };
  });

  await profilesRepository.atualizar(idPerfil, { faixaEtaria: faixa.code });

  await auditService.registrar(auditService.usuario(idUsuario), 'conta.criada', {
    entidade: 'user',
    id: idUsuario,
    depois: { email, apelido: apelidoLimpo, faixaEtaria: faixa.code, consentimentoDeResponsavel: precisaDeConsentimento },
  });

  if (precisaDeConsentimento) {
    await auditService.registrar(auditService.usuario(idUsuario), 'consentimento.registrado', {
      entidade: 'user',
      id: idUsuario,
      depois: { emailResponsavel: email, idade },
    });
  }

  return {
    id: idUsuario,
    email,
    apelido: apelidoLimpo,
    idPerfil,
    faixaEtaria: faixa.code,
    consentimentoDeResponsavel: precisaDeConsentimento,
  };
}

export async function atualizar(id, { apelido, email, dataNasc, senha }, ator) {
  exigirPosse(id, ator);

  const anterior = await obter(id);

  let senhaHash = null;
  if (senha) {
    exigirSenhaValida(senha);
    senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);
  }

  const afetadas = await usersRepository.atualizar(id, { apelido, email, dataNasc, senhaHash });
  if (afetadas === 0) throw erroNaoEncontrado('Usuário não encontrado');

  await auditService.registrar(quemAgiu(ator), 'conta.atualizada', {
    entidade: 'user',
    id,
    antes: { apelido: anterior.nickname, email: anterior.email },
    depois: {
      apelido: apelido ?? anterior.nickname,
      email: email ?? anterior.email,
      senhaAlterada: Boolean(senha),
    },
  });

  return usersRepository.buscarPorId(id);
}

export async function inativar(id, ator) {
  exigirPosse(id, ator);

  const usuario = await obter(id);

  const afetadas = await usersRepository.inativar(id);
  if (afetadas === 0) throw erroNaoEncontrado('Usuário não encontrado');

  await auditService.registrar(quemAgiu(ator), 'conta.inativada', {
    entidade: 'user',
    id,
    antes: { ativa: Boolean(usuario.is_active) },
    depois: { ativa: false },
  });
}
