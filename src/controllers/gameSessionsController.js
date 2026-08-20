import * as gameSessionService from '../services/gameSessionService.js';
import { assincrono } from '../utils/erros.js';


export const abrir = assincrono(async (req, res) => {
  const partida = await gameSessionService.abrir(req.session.usuarioId, Number(req.body.idCelula));

  res.status(201).json({
    token: partida.token,
    ehRepeticao: partida.ehRepeticao,
    celula: {
      id: Number(partida.celula.id),
      titulo: partida.celula.title,
      tipoDeJogo: partida.celula.game_type_slug,
    },
    conteudo: partida.conteudo,
    estado: partida.estado,
    retomada: partida.retomada,
  });
});

export const fechar = assincrono(async (req, res) => {
  const resultado = await gameSessionService.fechar(req.session.usuarioId, req.params.token, {
    respostas: req.body.respostas,
  });

  res.json(resultado);
});

export const salvarEstado = assincrono(async (req, res) => {
  res.json(await gameSessionService.salvarEstado(req.session.usuarioId, req.params.token, req.body.respostas));
});

export const abandonar = assincrono(async (req, res) => {
  res.json(await gameSessionService.abandonar(req.session.usuarioId, req.params.token));
});
