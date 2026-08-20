import * as gameSessionsRepository from '../repositories/gameSessionsRepository.js';
import * as progressRepository from '../repositories/progressRepository.js';
import * as streaksRepository from '../repositories/streaksRepository.js';


export const FONTES_DE_PROGRESSO = {
  async cell_completed(idUsuario, janela) {
    const conclusoes = await gameSessionsRepository.listarConclusoesNoIntervalo(idUsuario, janela.inicio, janela.fim);
    return conclusoes.length;
  },
  async active_days(idUsuario, janela) {
    const eventos = await streaksRepository.listarEventos(idUsuario, janela.dataInicial, janela.dataFinal);
    return eventos.filter((evento) => evento.tipo === 'cumprido').length;
  },
  async hive_completed(idUsuario, janela) {
    return progressRepository.contarFavosConcluidosNoIntervalo(idUsuario, janela.inicio, janela.fim);
  },
};

export function fontesMensuraveis() {
  return Object.keys(FONTES_DE_PROGRESSO);
}

export async function medir(fonte, idUsuario, janela) {
  const consulta = FONTES_DE_PROGRESSO[fonte];
  if (!consulta) return null;
  return Number(await consulta(idUsuario, janela));
}
