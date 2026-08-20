import * as itemsService from '../services/itemsService.js';
import { assincrono } from '../utils/erros.js';

export const listar = assincrono(async (req, res) => {
  res.json(await itemsService.listarCatalogo());
});
