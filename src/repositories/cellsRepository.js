import { consultar } from '../config/database.js';


const CAMPOS = `c.id, c.hive_id, c.game_type_id, c.age_band_id, c.order_index,
                c.title, c.estimated_seconds,
                gt.slug AS game_type_slug, gt.name AS game_type_name,
                ab.code AS age_band_code`;

const JOINS = `JOIN game_types gt ON gt.id = c.game_type_id
               JOIN age_bands ab ON ab.id = c.age_band_id`;

const ATIVO = 'c.is_active = 1 AND c.deleted_at IS NULL';

const PROGRESSO = `COALESCE(cp.stars, 0) AS stars,
                   COALESCE(cp.attempts, 0) AS attempts,
                   COALESCE(cp.errors, 0) AS errors,
                   COALESCE(cp.best_score, 0) AS best_score,
                   cp.first_completed_at, cp.last_completed_at`;

const JOIN_PROGRESSO = 'LEFT JOIN cell_progress cp ON cp.cell_id = c.id AND cp.user_id = ?';

function marcadores(quantidade) {
  return Array(quantidade).fill('?').join(', ');
}

export async function listarDoFavoComProgresso(idFavo, idUsuario, codigosDeFaixa = []) {
  if (codigosDeFaixa.length === 0) return [];

  return consultar(
    `SELECT ${CAMPOS}, ${PROGRESSO}
       FROM cells c
       ${JOINS}
       ${JOIN_PROGRESSO}
      WHERE c.hive_id = ? AND ${ATIVO} AND ab.code IN (${marcadores(codigosDeFaixa.length)})
      ORDER BY c.order_index, c.id`,
    [idUsuario, idFavo, ...codigosDeFaixa],
  );
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM cells c
       ${JOINS}
      WHERE c.id = ? AND ${ATIVO}`,
    [id],
  );
  return linhas[0] ?? null;
}

export async function buscarAnterior(celula) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM cells c
       ${JOINS}
      WHERE ${ATIVO} AND c.hive_id = ? AND c.order_index < ?
      ORDER BY c.order_index DESC
      LIMIT 1`,
    [celula.hive_id, celula.order_index],
  );
  return linhas[0] ?? null;
}

export async function contarPorFavos(idsDeFavo = [], codigosDeFaixa = []) {
  if (idsDeFavo.length === 0 || codigosDeFaixa.length === 0) return new Map();

  const linhas = await consultar(
    `SELECT c.hive_id, COUNT(*) AS total
       FROM cells c
       ${JOINS}
      WHERE c.hive_id IN (${marcadores(idsDeFavo.length)})
        AND ${ATIVO} AND ab.code IN (${marcadores(codigosDeFaixa.length)})
      GROUP BY c.hive_id`,
    [...idsDeFavo, ...codigosDeFaixa],
  );

  return new Map(linhas.map((linha) => [Number(linha.hive_id), Number(linha.total)]));
}
