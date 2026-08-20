import * as schedulesRepository from '../repositories/schedulesRepository.js';
import { erroValidacao } from '../utils/erros.js';


const NOMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function normalizarDias(dias) {
  const lista = Array.isArray(dias) ? dias : [dias];
  const normalizados = lista
    .filter((dia) => dia !== undefined && dia !== null && dia !== '')
    .map((dia) => Number(dia));

  for (const dia of normalizados) {
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
      throw erroValidacao(`Dia da semana inválido: ${dia}. Use 0 (domingo) a 6 (sábado).`);
    }
  }

  return [...new Set(normalizados)];
}

export async function obterSemana(idUsuario) {
  const linhas = await schedulesRepository.listarPorUsuario(idUsuario);
  return linhas.map((linha) => ({
    diaSemana: Number(linha.weekday),
    nome: NOMES[Number(linha.weekday)],
    disponivel: Boolean(linha.is_available),
  }));
}

export async function diasDisponiveis(idUsuario) {
  return schedulesRepository.diasDisponiveis(idUsuario);
}

export async function definirSemana(conexao, idUsuario, dias) {
  return schedulesRepository.definirSemana(conexao, idUsuario, normalizarDias(dias));
}

export async function definirDia(conexao, idUsuario, diaSemana, disponivel) {
  const [dia] = normalizarDias([diaSemana]);
  return schedulesRepository.definirDia(conexao, { idUsuario, diaSemana: dia, disponivel });
}
