import { consultarEm } from '../config/database.js';


const CAMPOS = `id, user_id, current_days, best_days, shields_available,
                DATE_FORMAT(last_counted_date, '%Y-%m-%d') AS last_counted_date,
                last_evaluated_at, created_at`;

export async function buscarPorUsuario(idUsuario, conexao = null) {
  const linhas = await consultarEm(conexao, `SELECT ${CAMPOS} FROM streaks WHERE user_id = ?`, [idUsuario]);
  return linhas[0] ?? null;
}

export async function criarSeNaoExistir(idUsuario, conexao = null) {
  await consultarEm(conexao, 'INSERT IGNORE INTO streaks (user_id) VALUES (?)', [idUsuario]);
  return buscarPorUsuario(idUsuario, conexao);
}

export async function atualizar(idUsuario, { diasAtuais, melhorDias, ultimoDiaContado, avaliadoEm }, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE streaks
        SET current_days      = ?,
            best_days         = ?,
            last_counted_date = ?,
            last_evaluated_at = ?
      WHERE user_id = ?`,
    [diasAtuais, melhorDias, ultimoDiaContado, avaliadoEm, idUsuario],
  );
  return resultado.affectedRows ?? 0;
}

export async function registrarEvento({ idUsuario, data, tipo }, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    `INSERT IGNORE INTO streak_events (user_id, event_date, event_type_id)
     VALUES (?, ?, (SELECT id FROM streak_event_types WHERE slug = ?))`,
    [idUsuario, data, tipo],
  );
  return (resultado.affectedRows ?? 0) === 1;
}

export async function listarEventos(idUsuario, dataInicial, dataFinal, conexao = null) {
  return consultarEm(
    conexao,
    `SELECT DATE_FORMAT(e.event_date, '%Y-%m-%d') AS data, t.slug AS tipo
       FROM streak_events e
       JOIN streak_event_types t ON t.id = e.event_type_id
      WHERE e.user_id = ? AND e.event_date >= ? AND e.event_date <= ?
      ORDER BY e.event_date`,
    [idUsuario, dataInicial, dataFinal],
  );
}

export async function definirEscudos(conexao, idUsuario, quantidade) {
  const resultado = await consultarEm(conexao, 'UPDATE streaks SET shields_available = ? WHERE user_id = ?', [
    quantidade,
    idUsuario,
  ]);
  return resultado.affectedRows ?? 0;
}
