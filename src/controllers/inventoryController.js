import * as inventoryService from '../services/inventoryService.js';
import { assincrono } from '../utils/erros.js';

export const meu = assincrono(async (req, res) => {
  res.json(await inventoryService.listarAgrupadoPorItem(req.session.usuarioId));
});
