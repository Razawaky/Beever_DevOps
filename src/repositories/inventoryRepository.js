import { consultar, consultarEm } from '../config/database.js';


const CAMPOS = `inv.id, inv.item_id, inv.purchase_id, inv.current_value, inv.overdue_cycles,
                inv.is_equipped, inv.acquired_at, inv.sold_at, inv.sold_value,
                s.slug AS status, i.name AS item_name, i.slug AS item_slug,
                i.counts_in_patrimony, i.upkeep_cost, i.income_per_cycle,
                c.name AS category_name`;

const JOINS = `JOIN items i ON i.id = inv.item_id
               JOIN item_categories c ON c.id = i.category_id
               JOIN inventory_statuses s ON s.id = inv.status_id`;

export async function listarPorUsuario(idUsuario) {
  return consultar(
    `SELECT ${CAMPOS}
       FROM inventory inv
       ${JOINS}
      WHERE inv.user_id = ? AND s.slug NOT IN ('vendido', 'consumido')
      ORDER BY inv.acquired_at DESC, inv.id DESC`,
    [idUsuario],
  );
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    `SELECT ${CAMPOS}, inv.user_id
       FROM inventory inv
       ${JOINS}
      WHERE inv.id = ?`,
    [id],
  );
  return linhas[0] ?? null;
}

export async function adicionar(conexao, { idUsuario, idItem, idCompra = null, valorInicial }) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO inventory (user_id, item_id, purchase_id, status_id, current_value)
     VALUES (?, ?, ?, (SELECT id FROM inventory_statuses WHERE slug = 'ativo'), ?)`,
    [idUsuario, idItem, idCompra, valorInicial],
  );
  return resultado.insertId;
}

export async function contarDoItem(idUsuario, idItem) {
  const linhas = await consultar(
    `SELECT COUNT(*) AS total
       FROM inventory inv
       JOIN inventory_statuses s ON s.id = inv.status_id
      WHERE inv.user_id = ? AND inv.item_id = ? AND s.slug NOT IN ('vendido', 'consumido')`,
    [idUsuario, idItem],
  );
  return Number(linhas[0]?.total ?? 0);
}

export async function possuiItem(idUsuario, idItem) {
  return (await contarDoItem(idUsuario, idItem)) > 0;
}

export async function valorTotalEmPatrimonio(idUsuario) {
  const linhas = await consultar(
    `SELECT COALESCE(SUM(inv.current_value), 0) AS total
       FROM inventory inv
       JOIN items i ON i.id = inv.item_id
       JOIN inventory_statuses s ON s.id = inv.status_id
      WHERE inv.user_id = ? AND s.slug NOT IN ('vendido', 'consumido') AND i.counts_in_patrimony = 1`,
    [idUsuario],
  );
  return Number(linhas[0]?.total ?? 0);
}

export async function marcarComoVendido(conexao, id, valorVenda) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE inventory
        SET status_id = (SELECT id FROM inventory_statuses WHERE slug = 'vendido'),
            sold_at = NOW(),
            sold_value = ?,
            is_equipped = 0
      WHERE id = ?
        AND status_id <> (SELECT id FROM inventory_statuses WHERE slug = 'vendido')`,
    [valorVenda, id],
  );
  return resultado.affectedRows;
}

export async function contarAtivosDoItem(idUsuario, idItem, conexao = null) {
  const linhas = await consultarEm(
    conexao,
    `SELECT COUNT(*) AS total
       FROM inventory inv
       JOIN inventory_statuses s ON s.id = inv.status_id
      WHERE inv.user_id = ? AND inv.item_id = ? AND s.slug = 'ativo'`,
    [idUsuario, idItem],
  );
  return Number(linhas[0]?.total ?? 0);
}

export async function bloquearUnidadeAtivaDoItem(conexao, idUsuario, idItem) {
  const linhas = await consultarEm(
    conexao,
    `SELECT inv.id
       FROM inventory inv
       JOIN inventory_statuses s ON s.id = inv.status_id
      WHERE inv.user_id = ? AND inv.item_id = ? AND s.slug = 'ativo'
      ORDER BY inv.acquired_at, inv.id
      LIMIT 1
      FOR UPDATE`,
    [idUsuario, idItem],
  );
  return linhas[0] ?? null;
}

export async function marcarComoConsumido(conexao, id) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE inventory
        SET status_id = (SELECT id FROM inventory_statuses WHERE slug = 'consumido'),
            is_equipped = 0
      WHERE id = ?
        AND status_id = (SELECT id FROM inventory_statuses WHERE slug = 'ativo')`,
    [id],
  );
  return (resultado.affectedRows ?? 0) === 1;
}
