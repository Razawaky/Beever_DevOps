import * as healthService from '../services/healthService.js';
import { assincrono } from '../utils/erros.js';

export const mostrar = assincrono(async (req, res) => {
  const saude = await healthService.verificarSaude();
  res.status(saude.status === 'ok' ? 200 : 503).json(saude);
});
