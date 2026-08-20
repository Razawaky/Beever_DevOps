import * as goalsService from '../services/goalsService.js';
import { assincrono } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';

export const listar = assincrono(async (req, res) => {
  res.json(await goalsService.listarDoUsuario(req.session.usuarioId));
});

export const renovar = assincrono(async (req, res) => {
  const meta = await goalsService.renovar(Number(req.params.id), req.session.usuarioId);

  if (querJson(req)) return res.status(201).json(meta);
  res.redirect('/metas');
});

export const concluir = assincrono(async (req, res) => {
  const recompensa = await goalsService.concluir(Number(req.params.id), req.session.usuarioId);

  if (querJson(req)) return res.json(recompensa);
  res.redirect('/metas');
});
