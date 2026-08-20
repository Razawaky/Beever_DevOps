import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { sessaoMiddleware } from './config/session.js';
import { csrf } from './middlewares/csrf.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { limiteGlobal } from './middlewares/rateLimiters.js';
import { requestId } from './middlewares/requestId.js';
import rotas from './routes/index.js';

const diretorioAtual = path.dirname(fileURLToPath(import.meta.url));

export function criarApp() {
  const app = express();

  if (env.producao) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    })
  );

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      autoLogging: { ignore: (req) => req.url === '/health' },
    }),
  );

  app.set('view engine', 'ejs');
  app.set('views', path.join(diretorioAtual, 'views'));
  app.use(express.static(path.join(diretorioAtual, 'public'), { maxAge: env.producao ? '7d' : 0 }));

  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(express.json({ limit: '100kb' }));

  app.use(sessaoMiddleware);
  app.use(csrf);
  app.use(limiteGlobal);

  app.use(rotas);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
