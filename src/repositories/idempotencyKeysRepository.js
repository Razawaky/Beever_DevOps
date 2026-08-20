import { consultarEm } from '../config/database.js';


export async function reservar(conexao, { chave, idUsuario, operacao, hashDoPedido = null }) {
  const resultado = await consultarEm(
    conexao,
    `INSERT IGNORE INTO idempotency_keys (idempotency_key, user_id, operation, response_hash)
     VALUES (?, ?, ?, ?)`,
    [chave, idUsuario, operacao, hashDoPedido],
  );
  return resultado.affectedRows === 1;
}

export async function buscar(chave, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    'SELECT id, idempotency_key, user_id, operation, response_hash, created_at FROM idempotency_keys WHERE idempotency_key = ?',
    [chave],
  );
  return linhas[0] ?? null;
}
