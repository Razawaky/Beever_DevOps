import { consultar, consultarEm } from '../config/database.js';


export async function registrar(conexao, { idUsuario, emailResponsavel, ipHash = null }) {
  const resultado = await consultarEm(
    conexao,
    'INSERT INTO guardian_consents (user_id, guardian_email, ip_hash) VALUES (?, ?, ?)',
    [idUsuario, emailResponsavel, ipHash],
  );
  return resultado.insertId;
}

export async function buscarPorUsuario(idUsuario) {
  const linhas = await consultar(
    `SELECT id, user_id, guardian_email, consented_at, ip_hash
       FROM guardian_consents
      WHERE user_id = ?
      ORDER BY consented_at DESC, id DESC
      LIMIT 1`,
    [idUsuario],
  );
  return linhas[0] ?? null;
}

export async function listarPorUsuario(idUsuario) {
  return consultar(
    `SELECT id, user_id, guardian_email, consented_at, ip_hash
       FROM guardian_consents
      WHERE user_id = ?
      ORDER BY consented_at, id`,
    [idUsuario],
  );
}
