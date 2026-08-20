import { consultar } from '../config/database.js';


const CAMPOS = `i.id, i.slug, i.name, i.description_kid, i.price, i.category_id,
                c.slug AS category_slug, c.name AS category_name,
                i.counts_in_patrimony, i.valuation_rate, i.valuation_floor_pct, i.valuation_cap_pct,
                i.upkeep_cost, i.income_per_cycle, i.upgrade_of_item_id, i.is_consumable`;

export async function listarAtivos() {
  return consultar(
    `SELECT ${CAMPOS}
       FROM items i
       JOIN item_categories c ON c.id = i.category_id
      WHERE i.is_active = 1 AND i.deleted_at IS NULL
      ORDER BY c.name, i.price, i.name`,
  );
}

export async function buscarAtivoPorId(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM items i
       JOIN item_categories c ON c.id = i.category_id
      WHERE i.id = ? AND i.is_active = 1 AND i.deleted_at IS NULL`,
    [id],
  );
  return linhas[0] ?? null;
}

export async function buscarPorSlug(slug) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}
       FROM items i
       JOIN item_categories c ON c.id = i.category_id
      WHERE i.slug = ?`,
    [slug],
  );
  return linhas[0] ?? null;
}

export async function listarRequisitos(idItem) {
  return consultar(
    `SELECT r.id, t.slug AS requirement_type, r.required_level, r.required_hive_id,
            r.required_item_id, r.required_patrimony
       FROM item_requirements r
       JOIN item_requirement_types t ON t.id = r.requirement_type_id
      WHERE r.item_id = ?
      ORDER BY r.id`,
    [idItem],
  );
}
