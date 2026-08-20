import { consultar, consultarEm } from '../config/database.js';
import { limiteSeguro } from '../utils/limite.js';


const CAMPOS = `gs.id, gs.user_id, gs.cell_id, gs.token, gs.started_at, gs.finished_at,
                gs.duration_seconds, gs.errors, gs.stars, gs.xp_awarded, gs.points_awarded,
                gs.coins_awarded, gs.is_replay, gs.saved_state, st.slug AS status`;

const JOINS = 'JOIN game_session_statuses st ON st.id = gs.status_id';

export async function iniciar(conexao, { idUsuario, idCelula, token, ehRepeticao = false }) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO game_sessions (user_id, cell_id, status_id, token, is_replay)
     VALUES (?, ?, (SELECT id FROM game_session_statuses WHERE slug = 'aberta'), ?, ?)`,
    [idUsuario, idCelula, token, ehRepeticao ? 1 : 0],
  );
  return resultado.insertId;
}

export async function buscarPorToken(token) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM game_sessions gs
       ${JOINS}
      WHERE gs.token = ?`,
    [token],
  );
  return linhas[0] ?? null;
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM game_sessions gs
       ${JOINS}
      WHERE gs.id = ?`,
    [id],
  );
  return linhas[0] ?? null;
}

export async function bloquearAbertaPorToken(conexao, token) {
  const linhas = await consultarEm(
    conexao,
    `SELECT ${CAMPOS}
       FROM game_sessions gs
       ${JOINS}
      WHERE gs.token = ? AND gs.finished_at IS NULL
      FOR UPDATE`,
    [token],
  );
  return linhas[0] ?? null;
}

export async function finalizar(
  conexao,
  { token, estrelas = 0, erros = 0, xp = 0, pontos = 0, moedas = 0, ehRepeticao = null },
) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE game_sessions
        SET status_id = (SELECT id FROM game_session_statuses WHERE slug = 'concluida'),
            finished_at = NOW(),
            duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()),
            stars = ?, errors = ?, xp_awarded = ?, points_awarded = ?, coins_awarded = ?,
            is_replay = COALESCE(?, is_replay)
      WHERE token = ? AND finished_at IS NULL`,
    [estrelas, erros, xp, pontos, moedas, ehRepeticao === null ? null : Number(ehRepeticao), token],
  );
  return resultado.affectedRows;
}

export async function abandonar(conexao, token) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE game_sessions
        SET status_id = (SELECT id FROM game_session_statuses WHERE slug = 'abandonada'),
            finished_at = NOW(),
            duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW())
      WHERE token = ? AND finished_at IS NULL`,
    [token],
  );
  return resultado.affectedRows;
}

export async function buscarAbertaDaCelula(idUsuario, idCelula) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM game_sessions gs
       ${JOINS}
      WHERE gs.user_id = ? AND gs.cell_id = ? AND gs.finished_at IS NULL
      ORDER BY gs.started_at DESC, gs.id DESC
      LIMIT 1`,
    [idUsuario, idCelula],
  );
  return linhas[0] ?? null;
}

export async function salvarEstado(token, estado) {
  const resultado = await consultar(
    `UPDATE game_sessions
        SET saved_state = CAST(? AS JSON)
      WHERE token = ? AND finished_at IS NULL`,
    [JSON.stringify(estado), token],
  );
  return resultado.affectedRows;
}

export async function listarPorUsuario(idUsuario, limite = 20) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM game_sessions gs
       ${JOINS}
      WHERE gs.user_id = ?
      ORDER BY gs.started_at DESC, gs.id DESC
      LIMIT ${limiteSeguro(limite, { padrao: 20 })}`,
    [idUsuario],
  );
}

export async function contarConcluidasNaCelula(idUsuario, idCelula) {
  const linhas = await consultar(
    `SELECT COUNT(*) AS total
       FROM game_sessions gs
       JOIN game_session_statuses st ON st.id = gs.status_id
      WHERE gs.user_id = ? AND gs.cell_id = ? AND st.slug = 'concluida'`,
    [idUsuario, idCelula],
  );
  return Number(linhas[0]?.total ?? 0);
}

export async function listarConclusoesNoIntervalo(idUsuario, inicio, fim) {
  return consultar(
    `SELECT gs.finished_at
       FROM game_sessions gs
       JOIN game_session_statuses st ON st.id = gs.status_id
      WHERE gs.user_id = ? AND st.slug = 'concluida'
        AND gs.finished_at >= ? AND gs.finished_at < ?
      ORDER BY gs.finished_at`,
    [idUsuario, inicio, fim],
  );
}
