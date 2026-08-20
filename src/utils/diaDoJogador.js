
export const FUSO_PADRAO = 'America/Sao_Paulo';

const MILISSEGUNDOS_POR_DIA = 86400000;

export function fusoValido(fuso) {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: fuso });
    return fuso;
  } catch {
    return FUSO_PADRAO;
  }
}

function partesNoFuso(instante, fuso) {
  const formatador = new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoValido(fuso),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const partes = {};
  for (const parte of formatador.formatToParts(instante)) {
    if (parte.type !== 'literal') partes[parte.type] = Number(parte.value);
  }
  return partes;
}

function comDoisDigitos(numero) {
  return String(numero).padStart(2, '0');
}

export function dataDoDia(instante = new Date(), fuso = FUSO_PADRAO) {
  const { year, month, day } = partesNoFuso(instante, fuso);
  return `${year}-${comDoisDigitos(month)}-${comDoisDigitos(day)}`;
}

function deslocamento(instante, fuso) {
  const { year, month, day, hour, minute, second } = partesNoFuso(instante, fuso);
  const semMilissegundos = Math.floor(instante.getTime() / 1000) * 1000;
  return Date.UTC(year, month - 1, day, hour, minute, second) - semMilissegundos;
}

export function inicioDoDia(dataISO, fuso = FUSO_PADRAO) {
  const meiaNoiteUtc = Date.parse(`${dataISO}T00:00:00Z`);
  const chute = new Date(meiaNoiteUtc - deslocamento(new Date(meiaNoiteUtc), fuso));
  return new Date(meiaNoiteUtc - deslocamento(chute, fuso));
}

export function fimDoDia(dataISO, fuso = FUSO_PADRAO) {
  return inicioDoDia(somarDias(dataISO, 1), fuso);
}

export function inicioDaSemana(dataISO, fuso = FUSO_PADRAO) {
  return inicioDoDia(somarDias(dataISO, -diaDaSemana(dataISO)), fuso);
}

export function fimDaSemana(dataISO, fuso = FUSO_PADRAO) {
  return inicioDoDia(somarDias(dataISO, 7 - diaDaSemana(dataISO)), fuso);
}

export function diaDaSemana(dataISO) {
  return new Date(`${dataISO}T00:00:00Z`).getUTCDay();
}

export function somarDias(dataISO, dias) {
  const movida = new Date(Date.parse(`${dataISO}T00:00:00Z`) + dias * MILISSEGUNDOS_POR_DIA);
  return movida.toISOString().slice(0, 10);
}

export function diferencaEmDias(dataInicial, dataFinal) {
  return Math.round((Date.parse(`${dataFinal}T00:00:00Z`) - Date.parse(`${dataInicial}T00:00:00Z`)) / MILISSEGUNDOS_POR_DIA);
}

export function diaDoAno(dataISO) {
  return diferencaEmDias(`${dataISO.slice(0, 4)}-01-01`, dataISO) + 1;
}
