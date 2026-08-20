export function limiteSeguro(valor, { padrao = 50, maximo = 200 } = {}) {
  const numero = Number.parseInt(valor, 10);
  if (!Number.isInteger(numero) || numero <= 0) return padrao;
  return Math.min(numero, maximo);
}
