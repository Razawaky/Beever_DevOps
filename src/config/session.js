import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import { v4 as uuidv4 } from 'uuid';

import { env } from './env.js';
import { pool } from './database.js';

const MySQLStore = MySQLStoreFactory(session);

export const sessionStore = new MySQLStore(
  {
    createDatabaseTable: false,
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000,
    schema: {
      tableName: 'sessions',
      columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' },
    },
  },
  pool
);

export const sessaoMiddleware = session({
  name: 'beever.sid',
  genid: () => uuidv4(),
  secret: env.sessao.segredo,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.producao,
    maxAge: env.sessao.duracaoMs,
  },
});

export function fecharSessionStore() {
  return new Promise((resolve) => sessionStore.close(resolve));
}
