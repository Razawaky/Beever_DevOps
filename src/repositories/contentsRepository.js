import { consultar } from '../config/database.js';


const CAMPOS = 'ct.id, ct.cell_id, ct.version, ct.body, ct.created_at';

const ATIVO = 'ct.is_active = 1 AND ct.deleted_at IS NULL';

export async function buscarAtualDaCelula(idCelula) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM contents ct
      WHERE ct.cell_id = ? AND ${ATIVO}
      ORDER BY ct.version DESC
      LIMIT 1`,
    [idCelula],
  );
  return linhas[0] ?? null;
}

export async function listarVersoesDaCelula(idCelula) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM contents ct
      WHERE ct.cell_id = ? AND ${ATIVO}
      ORDER BY ct.version DESC`,
    [idCelula],
  );
}

export async function listarConteudoAtualDasCelulas(idsDeCelula = []) {
  if (idsDeCelula.length === 0) return [];

  const marcadores = Array(idsDeCelula.length).fill('?').join(', ');
  return consultar(
    `SELECT ct.cell_id, ct.body
       FROM contents ct
      WHERE ct.cell_id IN (${marcadores}) AND ${ATIVO}
        AND ct.version = (
              SELECT MAX(recente.version)
                FROM contents recente
               WHERE recente.cell_id = ct.cell_id AND recente.is_active = 1 AND recente.deleted_at IS NULL
            )`,
    idsDeCelula,
  );
}
