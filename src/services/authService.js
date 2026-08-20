import bcrypt from 'bcrypt';

import * as profilesRepository from '../repositories/profilesRepository.js';
import * as usersRepository from '../repositories/usersRepository.js';
import { ErroAplicacao } from '../utils/erros.js';
import * as auditService from './auditService.js';


const erroCredenciais = () =>
  new ErroAplicacao('E-mail ou senha inválidos', { status: 401, codigo: 'CREDENCIAIS_INVALIDAS' });

export async function autenticar({ email, senha }) {
  const usuario = await usersRepository.buscarPorEmailComSenha(email);
  if (!usuario) throw erroCredenciais();

  const senhaCorreta = await bcrypt.compare(senha, usuario.password_hash);
  if (!senhaCorreta) throw erroCredenciais();

  if (!usuario.is_active) {
    throw new ErroAplicacao('Esta conta está inativa', { status: 403, codigo: 'CONTA_INATIVA' });
  }

  await usersRepository.atualizarUltimoLogin(usuario.id);

  const perfil = await profilesRepository.buscarPorUsuario(usuario.id);

  const ator = usuario.eh_admin ? auditService.admin(usuario.id) : auditService.usuario(usuario.id);
  await auditService.registrar(ator, 'sessao.login', { entidade: 'user', id: usuario.id });

  return {
    id: usuario.id,
    email: usuario.email,
    apelido: usuario.nickname,
    ehAdmin: Boolean(usuario.eh_admin),
    perfilId: perfil?.id ?? null,
    onboardingConcluido: Boolean(usuario.onboarding_completed_at),
  };
}

export async function registrarLogout(usuarioId, ehAdmin) {
  const ator = ehAdmin ? auditService.admin(usuarioId) : auditService.usuario(usuarioId);
  await auditService.registrar(ator, 'sessao.logout', { entidade: 'user', id: usuarioId });
}
