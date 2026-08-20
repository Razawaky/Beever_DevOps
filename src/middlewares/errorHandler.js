import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ErroAplicacao } from '../utils/erros.js';
import { renderizarPagina } from '../utils/pagina.js';

export function errorHandler(erro, req, res, next) {
  if (res.headersSent) return next(erro);

  const esperado = erro instanceof ErroAplicacao;
  const status = esperado ? erro.status : 500;

  const log = req.log ?? logger;
  if (status >= 500) {
    log.error({ erro, url: req.originalUrl, metodo: req.method }, 'Erro não tratado');
  } else {
    log.warn({ codigo: erro.codigo, url: req.originalUrl }, erro.message);
  }

  const mensagem = esperado ? erro.message : 'Erro interno do servidor';

  if (req.accepts(['html', 'json']) === 'json') {
    return res.status(status).json({
      erro: mensagem,
      codigo: esperado ? erro.codigo : 'ERRO_INTERNO',
      requestId: req.id,
      ...(esperado && erro.detalhes ? { detalhes: erro.detalhes } : {}),
    });
  }

  res.status(status);
  return renderizarPagina(res, 'erro', {
    titulo: `Erro ${status}`,
    comCabecalho: true,
    comRodape: true,
    status,
    mensagem,
    requestId: req.id,
    stack: env.producao ? null : erro.stack,
  });
}
