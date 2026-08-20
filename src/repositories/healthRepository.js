import { consultar } from '../config/database.js';


export async function ping() {
  const linhas = await consultar('SELECT 1 AS ok');
  return linhas[0]?.ok === 1;
}

export async function contarMigrationsAplicadas() {
  const linhas = await consultar('SELECT COUNT(*) AS total FROM schema_migrations');
  return Number(linhas[0]?.total ?? 0);
}
