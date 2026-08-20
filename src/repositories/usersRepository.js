import { consultar, consultarEm } from '../config/database.js';


const CAMPOS_PUBLICOS =
  'id, email, nickname, birth_date, is_active, onboarding_completed_at, created_at, last_login_at';

export async function listar() {
  return consultar(`SELECT ${CAMPOS_PUBLICOS} FROM users ORDER BY nickname`);
}

export async function buscarPorId(id) {
  const linhas = await consultar(`SELECT ${CAMPOS_PUBLICOS} FROM users WHERE id = ?`, [id]);
  return linhas[0] ?? null;
}

export async function buscarPorEmailComSenha(email) {
  const linhas = await consultar(
    `SELECT u.id, u.email, u.nickname, u.password_hash, u.is_active, u.onboarding_completed_at,
            (a.id IS NOT NULL) AS eh_admin
       FROM users u
       LEFT JOIN admins a ON a.user_id = u.id
      WHERE u.email = ?`,
    [email],
  );
  return linhas[0] ?? null;
}

export async function emailJaUsado(email) {
  const linhas = await consultar('SELECT 1 FROM users WHERE email = ? LIMIT 1', [email]);
  return linhas.length > 0;
}

export async function criar({ email, apelido, dataNasc, senhaHash }, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    'INSERT INTO users (email, nickname, birth_date, password_hash) VALUES (?, ?, ?, ?)',
    [email, apelido, dataNasc, senhaHash],
  );
  return resultado.insertId;
}

export async function atualizar(
  id,
  { apelido = null, email = null, dataNasc = null, senhaHash = null },
  conexao = null,
) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE users
        SET nickname      = COALESCE(?, nickname),
            email         = COALESCE(?, email),
            birth_date    = COALESCE(?, birth_date),
            password_hash = COALESCE(?, password_hash)
      WHERE id = ?`,
    [apelido, email, dataNasc, senhaHash, id],
  );
  return resultado.affectedRows;
}

export async function atualizarUltimoLogin(id) {
  await consultar('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [id]);
}

export async function marcarOnboardingConcluido(id, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    'UPDATE users SET onboarding_completed_at = UTC_TIMESTAMP() WHERE id = ? AND onboarding_completed_at IS NULL',
    [id],
  );
  return resultado.affectedRows;
}

export async function travarPorId(conexao, id) {
  const linhas = await consultarEm(conexao, 'SELECT id FROM users WHERE id = ? FOR UPDATE', [id]);
  return linhas[0] ?? null;
}

export async function inativar(id) {
  const resultado = await consultar('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
  return resultado.affectedRows;
}

export async function listarInativosParaExpurgo(dias) {
  return consultar(
    `SELECT id, email, nickname
       FROM users
      WHERE is_active = 0
        AND (last_login_at IS NULL OR last_login_at <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY))`,
    [dias],
  );
}

export async function removerPorIds(ids) {
  if (ids.length === 0) return 0;
  const marcadores = ids.map(() => '?').join(', ');
  const resultado = await consultar(`DELETE FROM users WHERE id IN (${marcadores})`, ids);
  return resultado.affectedRows;
}
