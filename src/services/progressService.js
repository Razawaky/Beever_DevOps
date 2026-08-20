import { emTransacao } from '../config/database.js';
import * as progressRepository from '../repositories/progressRepository.js';
import { erroValidacao } from '../utils/erros.js';
import * as contentService from './contentService.js';


const FAIXAS_DE_ESTRELA = [
  { ateErros: 1, estrelas: 3 },
  { ateErros: 3, estrelas: 2 },
];

const ESTRELA_MINIMA = 1;

export function estrelasPara(erros, concluiu) {
  if (!concluiu) return 0;

  const faixa = FAIXAS_DE_ESTRELA.find((linha) => Number(erros) <= linha.ateErros);
  return faixa ? faixa.estrelas : ESTRELA_MINIMA;
}

export async function registrarTentativa(idUsuario, idCelula, { erros = 0, pontuacao = 0, concluiu = false }, conexao = null) {
  const errosNumero = Number(erros);
  if (!Number.isInteger(errosNumero) || errosNumero < 0) {
    throw erroValidacao('A contagem de erros precisa ser um inteiro não negativo');
  }

  const { celula } = await contentService.abrirCelula(idUsuario, idCelula);
  const codigosDeFaixa = await contentService.faixasDoJogador(idUsuario);

  const estrelas = estrelasPara(errosNumero, concluiu);
  const gravar = async (c) => {
    await progressRepository.registrarTentativa(c, {
      idUsuario,
      idCelula,
      estrelas,
      erros: errosNumero,
      pontuacao: Number(pontuacao),
      concluidaEm: concluiu ? new Date() : null,
    });

    const favo = await progressRepository.recalcularFavo(c, idUsuario, celula.hive_id, codigosDeFaixa);
    const progressoDaCelula = await progressRepository.buscarProgressoDaCelula(idUsuario, idCelula, c);

    return { favo, progressoDaCelula };
  };

  const { favo, progressoDaCelula } = conexao ? await gravar(conexao) : await emTransacao(gravar);

  return {
    estrelas,
    concluiu,
    ehRepeticao: Boolean(celula.concluida),
    celula: progressoDaCelula,
    favo,
    favoConcluido: Boolean(favo?.completed_at),
  };
}

export async function recalcularFavo(idUsuario, idFavo, conexao = null) {
  const codigosDeFaixa = await contentService.faixasDoJogador(idUsuario);

  if (conexao) return progressRepository.recalcularFavo(conexao, idUsuario, idFavo, codigosDeFaixa);
  return emTransacao((c) => progressRepository.recalcularFavo(c, idUsuario, idFavo, codigosDeFaixa));
}

export async function resumoDoFavo(idUsuario, idFavo) {
  const codigosDeFaixa = await contentService.faixasDoJogador(idUsuario);
  const contagem = await progressRepository.contarCelulasDoFavo(idUsuario, idFavo, codigosDeFaixa);
  const percentual = contagem.total === 0 ? 0 : Math.floor((contagem.concluidas * 100) / contagem.total);

  return { ...contagem, percentual };
}
