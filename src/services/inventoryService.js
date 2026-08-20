import * as inventoryRepository from '../repositories/inventoryRepository.js';


export async function listarDoUsuario(idUsuario) {
  return inventoryRepository.listarPorUsuario(idUsuario);
}

export async function listarAgrupadoPorItem(idUsuario) {
  const unidades = await inventoryRepository.listarPorUsuario(idUsuario);
  const porItem = new Map();

  for (const unidade of unidades) {
    const chave = Number(unidade.item_id);
    const grupo = porItem.get(chave) ?? {
      itemId: chave,
      nome: unidade.item_name,
      slug: unidade.item_slug,
      categoria: unidade.category_name,
      quantidade: 0,
      valorTotal: 0,
      unidades: [],
    };

    grupo.quantidade += 1;
    grupo.valorTotal += Number(unidade.current_value);
    grupo.unidades.push(unidade);
    porItem.set(chave, grupo);
  }

  return [...porItem.values()];
}

export async function idsPossuidos(idUsuario) {
  const unidades = await inventoryRepository.listarPorUsuario(idUsuario);
  return new Set(unidades.map((unidade) => Number(unidade.item_id)));
}

export async function valorEmPatrimonio(idUsuario) {
  return inventoryRepository.valorTotalEmPatrimonio(idUsuario);
}
