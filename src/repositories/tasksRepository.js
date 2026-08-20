import { consultar, consultarEm } from '../config/database.js';


const CAMPOS = `t.id, t.user_id, t.task_type_id, t.target_value, t.current_value,
                t.reward_points, t.reward_coins, t.due_at, t.completed_at, t.created_at,
                tt.slug AS type_slug, tt.name AS title, tt.progress_source,
                sc.slug AS scope, st.slug AS status`;

const JOINS = `JOIN task_types tt ON tt.id = t.task_type_id
               JOIN task_scopes sc ON sc.id = tt.scope_id
               JOIN goal_statuses st ON st.id = t.status_id`;

export async function listarPorUsuario(idUsuario) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM tasks t
       ${JOINS}
      WHERE t.user_id = ?
      ORDER BY t.due_at, t.id`,
    [idUsuario],
  );
}

export async function listarAtivasPorUsuario(idUsuario) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM tasks t
       ${JOINS}
      WHERE t.user_id = ? AND st.slug = 'ativa'
      ORDER BY t.due_at, t.id`,
    [idUsuario],
  );
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM tasks t
       ${JOINS}
      WHERE t.id = ?`,
    [id],
  );
  return linhas[0] ?? null;
}

export async function criar(conexao, { idUsuario, idTipo, alvo = null, pontos = null, moedas = null, prazo }) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO tasks (user_id, task_type_id, status_id, target_value, reward_points, reward_coins, due_at)
     SELECT ?, tt.id,
            (SELECT id FROM goal_statuses WHERE slug = 'ativa'),
            COALESCE(?, tt.default_target),
            COALESCE(?, tt.reward_points),
            COALESCE(?, tt.reward_coins),
            ?
       FROM task_types tt
      WHERE tt.id = ?`,
    [idUsuario, alvo, pontos, moedas, prazo, idTipo],
  );
  return resultado.insertId;
}

export async function definirProgresso(conexao, id, valor) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE tasks
        SET current_value = LEAST(GREATEST(current_value, ?), target_value)
      WHERE id = ?
        AND completed_at IS NULL
        AND status_id = (SELECT id FROM goal_statuses WHERE slug = 'ativa')`,
    [valor, id],
  );
  return resultado.affectedRows;
}

export async function concluir(conexao, id) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE tasks
        SET completed_at = NOW(),
            status_id = (SELECT id FROM goal_statuses WHERE slug = 'concluida')
      WHERE id = ?
        AND completed_at IS NULL
        AND current_value >= target_value`,
    [id],
  );
  return resultado.affectedRows;
}

export async function expirarVencidasDoUsuario(idUsuario, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE tasks
        SET status_id = (SELECT id FROM goal_statuses WHERE slug = 'expirada')
      WHERE user_id = ?
        AND completed_at IS NULL
        AND due_at < NOW()
        AND status_id = (SELECT id FROM goal_statuses WHERE slug = 'ativa')`,
    [idUsuario],
  );
  return resultado.affectedRows;
}

export async function contarAtivas(idUsuario, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    `SELECT COUNT(*) AS total
       FROM tasks t
       JOIN goal_statuses st ON st.id = t.status_id
      WHERE t.user_id = ? AND st.slug = 'ativa'`,
    [idUsuario],
  );
  return Number(linhas[0]?.total ?? 0);
}

export async function expirarVencidas(conexao = null) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE tasks
        SET status_id = (SELECT id FROM goal_statuses WHERE slug = 'expirada')
      WHERE completed_at IS NULL
        AND due_at < NOW()
        AND status_id = (SELECT id FROM goal_statuses WHERE slug = 'ativa')`,
  );
  return resultado.affectedRows;
}

export async function listarTipos() {
  return consultar(
    `SELECT tt.id, tt.slug, tt.name, tt.progress_source, tt.default_target,
            tt.reward_points, tt.reward_coins, sc.slug AS scope
       FROM task_types tt
       JOIN task_scopes sc ON sc.id = tt.scope_id
      WHERE tt.is_active = 1
      ORDER BY sc.slug, tt.name`,
  );
}

export async function listarAtivasPorEscopoDesde(idUsuario, escopo, desde) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM tasks t
       ${JOINS}
      WHERE t.user_id = ? AND sc.slug = ? AND st.slug = 'ativa' AND t.created_at >= ?
      ORDER BY t.id`,
    [idUsuario, escopo, desde],
  );
}
