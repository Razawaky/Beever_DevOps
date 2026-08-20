import * as tasksService from '../services/tasksService.js';
import { assincrono } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';

export const listar = assincrono(async (req, res) => {
  res.json(await tasksService.listarDoUsuario(req.session.usuarioId));
});

export const concluir = assincrono(async (req, res) => {
  const recompensa = await tasksService.concluir(Number(req.params.id), req.session.usuarioId);

  if (querJson(req)) return res.json(recompensa);
  res.redirect('/metas');
});
