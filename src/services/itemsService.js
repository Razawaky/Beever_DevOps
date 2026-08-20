import * as inventoryRepository from '../repositories/inventoryRepository.js';
import * as itemsRepository from '../repositories/itemsRepository.js';
import * as levelsService from './levelsService.js';
import { erroNaoEncontrado } from '../utils/erros.js';


export async function listarCatalogo() {
  return itemsRepository.listarAtivos();
}

export async function obterAtivo(idItem) {
  const item = await itemsRepository.buscarAtivoPorId(idItem);
  if (!item) throw erroNaoEncontrado('Item não encontrado');
  return item;
}

export async function requisitosNaoCumpridos(idItem, idUsuario) {
  const requisitos = await itemsRepository.listarRequisitos(idItem);
  if (requisitos.length === 0) return [];

  const nivel = await levelsService.obterDoUsuario(idUsuario);
  const pendentes = [];

  for (const requisito of requisitos) {
    switch (requisito.requirement_type) {
      case 'nivel-minimo': {
        const exigido = Number(requisito.required_level);
        if (!nivel || nivel.nivel < exigido) {
          pendentes.push({ tipo: requisito.requirement_type, mensagem: `Chegue ao nível ${exigido}` });
        }
        break;
      }
      case 'item-prerequisito': {
        const possui = await inventoryRepository.possuiItem(idUsuario, requisito.required_item_id);
        if (!possui) {
          const prerequisito = await itemsRepository.buscarAtivoPorId(requisito.required_item_id);
          pendentes.push({
            tipo: requisito.requirement_type,
            mensagem: `Compre antes: ${prerequisito?.name ?? 'outro item'}`,
          });
        }
        break;
      }
      default:
        pendentes.push({
          tipo: requisito.requirement_type,
          mensagem: 'Este requisito ainda não pode ser verificado',
          naoVerificavelAinda: true,
        });
    }
  }

  return pendentes;
}
