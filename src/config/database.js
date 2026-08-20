import mysql from 'mysql2/promise';

import { env } from './env.js';
import { logger } from './logger.js';

export const pool = mysql.createPool({
  host: env.banco.host,
  port: env.banco.porta,
  user: env.banco.usuario,
  password: env.banco.senha,
  database: env.banco.nome,
  waitForConnections: true,
  connectionLimit: env.banco.limitePool,
  queueLimit: 0,
  charset: 'utf8mb4_0900_ai_ci',
  timezone: 'Z',
  namedPlaceholders: false,
});

export async function consultar(sql, parametros = []) {
  const [linhas] = await pool.execute(sql, parametros);
  return linhas;
}

export async function consultarEm(conexao, sql, parametros = []) {
  if (!conexao) return consultar(sql, parametros);
  const [linhas] = await conexao.execute(sql, parametros);
  return linhas;
}

export async function emTransacao(callback) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const resultado = await callback(conexao);
    await conexao.commit();
    return resultado;
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

export async function fecharPool() {
  await pool.end();
  logger.info('Pool de conexões MySQL encerrado');
}
