export function classeDaBarra(percentual) {
  const numero = Number(percentual);
  if (!Number.isFinite(numero)) return 'barra-0';

  const limitado = Math.min(100, Math.max(0, numero));
  return `barra-${Math.round(limitado / 5) * 5}`;
}
