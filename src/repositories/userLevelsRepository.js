import { consultar, consultarEm } from '../config/database.js';


export async function criar(idUsuario, conexao = null) {
  const [proximo] = await consultarEm(conexao, 'SELECT MIN(required_xp) AS xp FROM levels WHERE required_xp > 0');
  const resultado = await consultarEm(
    conexao,
    'INSERT INTO user_levels (user_id, level, xp_total, xp_next_level) VALUES (?, 1, 0, ?)',
    [idUsuario, proximo?.xp ?? 0],
  );
  return resultado.insertId;
}

export async function buscarPorUsuario(idUsuario, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    'SELECT id, user_id, level, xp_total, xp_next_level FROM user_levels WHERE user_id = ?',
    [idUsuario],
  );
  return linhas[0] ?? null;
}

export async function buscarCurva() {
  return consultar('SELECT level, required_xp, reward_coins FROM levels ORDER BY level');
}

export async function atualizar(conexao, idUsuario, { nivel, xpTotal, xpProximoNivel }) {
  const executar = conexao ? conexao.execute.bind(conexao) : null;
  const sql = 'UPDATE user_levels SET level = ?, xp_total = ?, xp_next_level = ? WHERE user_id = ?';
  const parametros = [nivel, xpTotal, xpProximoNivel, idUsuario];

  if (!executar) {
    const resultado = await consultar(sql, parametros);
    return resultado.affectedRows;
  }

  const [resultado] = await executar(sql, parametros);
  return resultado.affectedRows;
}

export async function lancarXp(conexao, { idUsuario, quantidade, motivo, referenciaTipo = null, referenciaId = null, saldoDepois }) {
  const [resultado] = await conexao.execute(
    `INSERT INTO xp_ledger (user_id, amount, reason_id, reference_type, reference_id, balance_after)
     SELECT ?, ?, r.id, ?, ?, ? FROM reward_reasons r WHERE r.slug = ?`,
    [idUsuario, quantidade, referenciaTipo, referenciaId, saldoDepois, motivo],
  );

  if (resultado.affectedRows === 0) {
    throw new Error(`Motivo de recompensa desconhecido: "${motivo}". Nenhum XP foi lançado.`);
  }
}
