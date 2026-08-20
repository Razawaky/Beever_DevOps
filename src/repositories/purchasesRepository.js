import { consultar, consultarEm } from '../config/database.js';
import { limiteSeguro } from '../utils/limite.js';


export async function criar(
  conexao,
  { idUsuario, idItem, quantidade = 1, precoUnitario, desconto = 0, precoTotal },
) {
  const resultado = await consultarEm(
    conexao,
    `INSERT INTO purchases (user_id, item_id, quantity, price_at_purchase, discount_applied, total_price)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [idUsuario, idItem, quantidade, precoUnitario, desconto, precoTotal],
  );
  return resultado.insertId;
}

export async function listarPorUsuario(idUsuario, limite = 50) {
  return consultar(
    `SELECT p.id, p.item_id, i.name AS item_name, i.slug AS item_slug,
            p.quantity, p.price_at_purchase, p.discount_applied, p.total_price, p.purchased_at
       FROM purchases p
       JOIN items i ON i.id = p.item_id
      WHERE p.user_id = ?
      ORDER BY p.purchased_at DESC, p.id DESC
      LIMIT ${limiteSeguro(limite)}`,
    [idUsuario],
  );
}

export async function buscarPorId(id) {
  const linhas = await consultar(
    `SELECT id, user_id, item_id, quantity, price_at_purchase, discount_applied, total_price, purchased_at
       FROM purchases
      WHERE id = ?`,
    [id],
  );
  return linhas[0] ?? null;
}

export async function buscarUltimaDoItem(idUsuario, idItem) {
  const linhas = await consultar(
    `SELECT id, user_id, item_id, quantity, price_at_purchase, discount_applied, total_price, purchased_at
       FROM purchases
      WHERE user_id = ? AND item_id = ?
      ORDER BY id DESC
      LIMIT 1`,
    [idUsuario, idItem],
  );
  return linhas[0] ?? null;
}

export async function totalGastoPorUsuario(idUsuario) {
  const linhas = await consultar(
    'SELECT COALESCE(SUM(total_price), 0) AS total FROM purchases WHERE user_id = ?',
    [idUsuario],
  );
  return Number(linhas[0]?.total ?? 0);
}
