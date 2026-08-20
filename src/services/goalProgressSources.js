import * as coinsService from './coinsService.js';
import * as levelsService from './levelsService.js';

export const FONTES_DE_PROGRESSO = {
  async coin_balance(idUsuario) {
    const carteira = await coinsService.obterCarteira(idUsuario);
    return carteira.mel;
  },
  async user_level(idUsuario) {
    const nivel = await levelsService.obterDoUsuario(idUsuario);
    return nivel?.nivel ?? 0;
  },
};

export function fontesMensuraveis() {
  return Object.keys(FONTES_DE_PROGRESSO);
}

export async function medir(fonte, idUsuario) {
  const consulta = FONTES_DE_PROGRESSO[fonte];
  if (!consulta) return null;
  return Number(await consulta(idUsuario));
}
