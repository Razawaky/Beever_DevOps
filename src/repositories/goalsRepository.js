import { consultar, consultarEm } from '../config/database.js';


const CAMPOS = `g.id, g.user_id, g.goal_type_id, g.difficulty_id,
                g.title, g.target_value, g.current_value,
                g.reward_coins, g.reward_points, g.starts_at, g.due_at, g.completed_at,
                g.renewed_from_goal_id, g.created_at,
                gt.slug AS type_slug, gt.progress_source,
                gd.slug AS difficulty, gd.reward_multiplier,
                st.slug AS status`;

const JOINS = `JOIN goal_types gt ON gt.id = g.goal_type_id
               JOIN goal_difficulties gd ON gd.id = g.difficulty_id
               JOIN goal_statuses st ON st.id = g.status_id`;

export async function listarPorUsuario(idUsuario) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM goals g
       ${JOINS}
      WHERE g.user_id = ?
      ORDER BY g.due_at, g.id`,
    [idUsuario],
  );
}

export async function listarAtivasPorUsuario(idUsuario, conexao = null) {
  return consultarEm(
    conexao,
    `SELECT ${CAMPOS}
       FROM goals g
       ${JOINS}
      WHERE g.user_id = ? AND st.slug = 'ativa'
      ORDER BY g.due_at, g.id`,
    [idUsuario],
  );
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM goals g
       ${JOINS}
      WHERE g.id = ?`,
    [id],
  );
  return linhas[0] ?? null;
}

export async function criar(
  conexao,
  { idUsuario, idTipo, idDificuldade, titulo, alvo, recompensaMoedas = 0, recompensaPontos = 0, prazo, renovadaDe = null },
) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO goals (user_id, goal_type_id, status_id, difficulty_id, title, target_value,
                        reward_coins, reward_points, due_at, renewed_from_goal_id)
     VALUES (?, ?, (SELECT id FROM goal_statuses WHERE slug = 'ativa'), ?, ?, ?, ?, ?, ?, ?)`,
    [idUsuario, idTipo, idDificuldade, titulo, alvo, recompensaMoedas, recompensaPontos, prazo, renovadaDe],
  );
  return resultado.insertId;
}

export async function atualizarProgresso(conexao, id, valorAtual) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE goals
        SET current_value = LEAST(?, target_value)
      WHERE id = ?
        AND completed_at IS NULL
        AND status_id = (SELECT id FROM goal_statuses WHERE slug = 'ativa')`,
    [valorAtual, id],
  );
  return resultado.affectedRows;
}

export async function concluir(conexao, id) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE goals
        SET completed_at = NOW(),
            status_id = (SELECT id FROM goal_statuses WHERE slug = 'concluida')
      WHERE id = ?
        AND completed_at IS NULL
        AND current_value >= target_value
        AND status_id = (SELECT id FROM goal_statuses WHERE slug = 'ativa')`,
    [id],
  );
  return resultado.affectedRows;
}

export async function listarVencidasPorUsuario(idUsuario) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM goals g
       ${JOINS}
      WHERE g.user_id = ? AND st.slug = 'ativa' AND g.completed_at IS NULL AND g.due_at < NOW()
      ORDER BY g.due_at`,
    [idUsuario],
  );
}

export async function expirarVencidasDoUsuario(conexao, idUsuario) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE goals
        SET status_id = (SELECT id FROM goal_statuses WHERE slug = 'expirada')
      WHERE user_id = ?
        AND completed_at IS NULL
        AND due_at < NOW()
        AND status_id = (SELECT id FROM goal_statuses WHERE slug = 'ativa')`,
    [idUsuario],
  );
  return resultado.affectedRows;
}

export async function listarExpiradasRenovaveis(idUsuario) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM goals g
       ${JOINS}
      WHERE g.user_id = ? AND st.slug = 'expirada' AND g.completed_at IS NULL
      ORDER BY g.due_at DESC`,
    [idUsuario],
  );
}

export async function marcarRenovada(conexao, id) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE goals
        SET status_id = (SELECT id FROM goal_statuses WHERE slug = 'renovada')
      WHERE id = ?
        AND completed_at IS NULL
        AND status_id = (SELECT id FROM goal_statuses WHERE slug = 'expirada')`,
    [id],
  );
  return resultado.affectedRows;
}

export async function expirarVencidas(conexao = null) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE goals
        SET status_id = (SELECT id FROM goal_statuses WHERE slug = 'expirada')
      WHERE completed_at IS NULL
        AND due_at < NOW()
        AND status_id = (SELECT id FROM goal_statuses WHERE slug = 'ativa')`,
  );
  return resultado.affectedRows;
}

export async function contarAtivas(idUsuario) {
  const linhas = await consultar(
    `SELECT COUNT(*) AS total
       FROM goals g
       JOIN goal_statuses st ON st.id = g.status_id
      WHERE g.user_id = ? AND st.slug = 'ativa'`,
    [idUsuario],
  );
  return Number(linhas[0]?.total ?? 0);
}

export async function listarRegrasDePlano() {
  return consultar(
    `SELECT r.id, r.min_weekdays, r.max_weekdays, r.active_goals,
            d.id AS difficulty_id, d.slug AS difficulty, d.default_days,
            d.reward_coins, d.reward_points, d.reward_multiplier
       FROM goal_plan_rules r
       JOIN goal_difficulties d ON d.id = r.difficulty_id
      ORDER BY r.min_weekdays`,
  );
}

export async function listarRegrasDeAlvo() {
  return consultar(
    `SELECT t.id AS goal_type_id, t.slug, t.name, t.progress_source,
            r.base_per_session, r.min_increment, r.max_increment, r.rounding_step
       FROM goal_target_rules r
       JOIN goal_types t ON t.id = r.goal_type_id
      ORDER BY t.id`,
  );
}

export async function buscarCatalogo() {
  const [tipos, dificuldades] = await Promise.all([
    consultar('SELECT id, slug, name, progress_source FROM goal_types ORDER BY id'),
    consultar(
      `SELECT id, slug, name, reward_multiplier, reward_coins, reward_points, default_days
         FROM goal_difficulties
        ORDER BY default_days`,
    ),
  ]);
  return { tipos, dificuldades };
}
