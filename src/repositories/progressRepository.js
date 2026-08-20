import { consultar, consultarEm } from '../config/database.js';


const CONCLUIDA = 'cp.first_completed_at IS NOT NULL AND cp.stars >= 1';

const CELULA_ATIVA = 'c.is_active = 1 AND c.deleted_at IS NULL';

function recorteDeFaixa(codigosDeFaixa) {
  if (codigosDeFaixa.length === 0) return { sql: '', parametros: [] };

  const marcadores = Array(codigosDeFaixa.length).fill('?').join(', ');
  return {
    sql: `AND EXISTS (SELECT 1 FROM age_bands ab WHERE ab.id = c.age_band_id AND ab.code IN (${marcadores}))`,
    parametros: codigosDeFaixa,
  };
}

export async function buscarProgressoDaCelula(idUsuario, idCelula, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    `SELECT cp.id, cp.user_id, cp.cell_id, cp.stars, cp.attempts, cp.errors,
            cp.best_score, cp.first_completed_at, cp.last_completed_at
       FROM cell_progress cp
      WHERE cp.user_id = ? AND cp.cell_id = ?`,
    [idUsuario, idCelula],
  );
  return linhas[0] ?? null;
}

export async function registrarTentativa(
  conexao,
  { idUsuario, idCelula, estrelas = 0, erros = 0, pontuacao = 0, concluidaEm = null },
) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO cell_progress
        (user_id, cell_id, stars, attempts, errors, best_score, first_completed_at, last_completed_at)
      VALUES (?, ?, ?, 1, ?, ?, ?, ?) AS nova
     ON DUPLICATE KEY UPDATE
        stars = GREATEST(cell_progress.stars, nova.stars),
        attempts = cell_progress.attempts + 1,
        errors = cell_progress.errors + nova.errors,
        best_score = GREATEST(cell_progress.best_score, nova.best_score),
        first_completed_at = COALESCE(cell_progress.first_completed_at, nova.first_completed_at),
        last_completed_at = COALESCE(nova.last_completed_at, cell_progress.last_completed_at)`,
    [idUsuario, idCelula, estrelas, erros, pontuacao, concluidaEm, concluidaEm],
  );
  return resultado.affectedRows;
}

export async function contarCelulasDoFavo(idUsuario, idFavo, codigosDeFaixa = []) {
  const faixa = recorteDeFaixa(codigosDeFaixa);
  const linhas = await consultar(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN ${CONCLUIDA} THEN 1 ELSE 0 END) AS concluidas
       FROM cells c
       LEFT JOIN cell_progress cp ON cp.cell_id = c.id AND cp.user_id = ?
      WHERE c.hive_id = ? AND ${CELULA_ATIVA} ${faixa.sql}`,
    [idUsuario, idFavo, ...faixa.parametros],
  );
  return { total: Number(linhas[0].total), concluidas: Number(linhas[0].concluidas ?? 0) };
}

export async function recalcularFavo(conexao, idUsuario, idFavo, codigosDeFaixa = []) {
  const percentual = 'CASE WHEN d.total = 0 THEN 0 ELSE FLOOR(d.concluidas * 100 / d.total) END';
  const completo = 'd.total > 0 AND d.concluidas = d.total';
  const faixa = recorteDeFaixa(codigosDeFaixa);

  await consultarEm(
    conexao,
    `INSERT INTO hive_progress (user_id, hive_id, completed_cells, total_cells, percent, completed_at)
     SELECT d.id_usuario, d.id_favo, d.concluidas, d.total,
            ${percentual},
            CASE WHEN ${completo} THEN NOW() ELSE NULL END
       FROM (
         SELECT ? AS id_usuario, c.hive_id AS id_favo,
                COUNT(*) AS total,
                SUM(CASE WHEN ${CONCLUIDA} THEN 1 ELSE 0 END) AS concluidas
           FROM cells c
           LEFT JOIN cell_progress cp ON cp.cell_id = c.id AND cp.user_id = ?
          WHERE c.hive_id = ? AND ${CELULA_ATIVA} ${faixa.sql}
          GROUP BY c.hive_id
       ) AS d
     ON DUPLICATE KEY UPDATE
        completed_cells = d.concluidas,
        total_cells = d.total,
        percent = ${percentual},
        completed_at = CASE WHEN ${completo} THEN COALESCE(hive_progress.completed_at, NOW()) ELSE NULL END`,
    [idUsuario, idUsuario, idFavo, ...faixa.parametros],
  );

  return buscarProgressoDoFavo(idUsuario, idFavo, conexao);
}

export async function buscarProgressoDoFavo(idUsuario, idFavo, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    `SELECT hp.id, hp.user_id, hp.hive_id, hp.completed_cells, hp.total_cells,
            hp.percent, hp.completed_at
       FROM hive_progress hp
      WHERE hp.user_id = ? AND hp.hive_id = ?`,
    [idUsuario, idFavo],
  );
  return linhas[0] ?? null;
}

export async function listarProgressoDosFavos(idUsuario) {
  return consultar(
    `SELECT hp.hive_id, hp.completed_cells, hp.total_cells, hp.percent, hp.completed_at
       FROM hive_progress hp
      WHERE hp.user_id = ?`,
    [idUsuario],
  );
}

export async function contarFavosConcluidosNoIntervalo(idUsuario, inicio, fim) {
  const linhas = await consultar(
    `SELECT COUNT(*) AS total
       FROM hive_progress
      WHERE user_id = ? AND completed_at IS NOT NULL
        AND completed_at >= ? AND completed_at < ?`,
    [idUsuario, inicio, fim],
  );
  return Number(linhas[0]?.total ?? 0);
}
