import { consultar } from '../config/database.js';


const CAMPOS = `h.id, h.slug, h.title, h.description, h.order_index,
                h.unlock_percent, h.required_patrimony, h.required_item_id,
                h.age_band_id, ab.code AS age_band_code,
                i.name AS required_item_name`;

const JOINS = `JOIN age_bands ab ON ab.id = h.age_band_id
               LEFT JOIN items i ON i.id = h.required_item_id`;

const ATIVO = 'h.is_active = 1 AND h.deleted_at IS NULL';

function marcadores(quantidade) {
  return Array(quantidade).fill('?').join(', ');
}

export async function listarPorFaixas(codigosDeFaixa = []) {
  if (codigosDeFaixa.length === 0) return [];

  return consultar(
    `SELECT ${CAMPOS}
       FROM hives h
       ${JOINS}
      WHERE ${ATIVO} AND ab.code IN (${marcadores(codigosDeFaixa.length)})
      ORDER BY ab.min_age, h.order_index, h.id`,
    codigosDeFaixa,
  );
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM hives h
       ${JOINS}
      WHERE h.id = ? AND ${ATIVO}`,
    [id],
  );
  return linhas[0] ?? null;
}

export async function buscarPorSlug(slug) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM hives h
       ${JOINS}
      WHERE h.slug = ? AND ${ATIVO}`,
    [slug],
  );
  return linhas[0] ?? null;
}

export async function buscarAnterior(favo) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM hives h
       ${JOINS}
      WHERE ${ATIVO} AND h.age_band_id = ? AND h.order_index < ?
      ORDER BY h.order_index DESC
      LIMIT 1`,
    [favo.age_band_id, favo.order_index],
  );
  return linhas[0] ?? null;
}
