#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import mysql from 'mysql2/promise';

import { env } from '../src/config/env.js';


const diretorioMigrations = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const TABELA_CONTROLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    versao      VARCHAR(255) NOT NULL,
    checksum    CHAR(64) DEFAULT NULL,
    aplicada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (versao)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
`;

export function separarComandos(sql) {
  return sql
    .split('\n')
    .filter((linha) => !linha.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((comando) => comando.trim())
    .filter((comando) => comando.length > 0);
}

export function calcularChecksum(sql) {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

export async function listarMigrations(diretorio = diretorioMigrations) {
  const arquivos = await readdir(diretorio);
  return arquivos.filter((nome) => nome.endsWith('.sql')).sort();
}

export function conferirChecksums(registradas, checksumsAtuais) {
  const alteradas = [];
  const sumidas = [];
  const semChecksum = [];

  for (const registro of registradas) {
    const atual = checksumsAtuais.get(registro.versao);

    if (atual === undefined) {
      sumidas.push(registro.versao);
      continue;
    }

    if (!registro.checksum) {
      semChecksum.push(registro.versao);
      continue;
    }

    if (registro.checksum !== atual) alteradas.push(registro.versao);
  }

  return { alteradas, sumidas, semChecksum };
}

async function garantirColunaChecksum(conexao) {
  const [colunas] = await conexao.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'schema_migrations' AND column_name = 'checksum'`,
  );
  if (colunas.length > 0) return;
  await conexao.query('ALTER TABLE schema_migrations ADD COLUMN checksum CHAR(64) DEFAULT NULL AFTER versao');
}

async function aplicar(conexao, diretorio, arquivo) {
  const sql = await readFile(path.join(diretorio, arquivo), 'utf8');
  const comandos = separarComandos(sql);

  await conexao.beginTransaction();
  try {
    for (const comando of comandos) {
      await conexao.query(comando);
    }
    await conexao.query('INSERT INTO schema_migrations (versao, checksum) VALUES (?, ?)', [
      arquivo,
      calcularChecksum(sql),
    ]);
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw new Error(`Falha na migration ${arquivo}: ${erro.message}`, { cause: erro });
  }
}

export async function migrar({ diretorio = diretorioMigrations, conexao } = {}) {
  const propria = !conexao;
  const conn =
    conexao ??
    (await mysql.createConnection({
      host: env.banco.host,
      port: env.banco.porta,
      user: env.banco.usuario,
      password: env.banco.senha,
      database: env.banco.nome,
      multipleStatements: false,
    }));

  const aplicadas = [];
  const avisos = [];
  try {
    await conn.query(TABELA_CONTROLE);
    await garantirColunaChecksum(conn);

    const arquivos = await listarMigrations(diretorio);
    const checksumsAtuais = new Map();
    for (const arquivo of arquivos) {
      checksumsAtuais.set(arquivo, calcularChecksum(await readFile(path.join(diretorio, arquivo), 'utf8')));
    }

    const [registradas] = await conn.query('SELECT versao, checksum FROM schema_migrations');
    const { alteradas, sumidas, semChecksum } = conferirChecksums(registradas, checksumsAtuais);

    if (alteradas.length > 0) {
      throw new Error(
        `Migration já aplicada foi alterada depois: ${alteradas.join(', ')}.\n` +
          'Editar arquivo aplicado não muda o banco e faz ambientes divergirem. ' +
          'Crie uma migration nova com a correção, ou recrie o banco com "npm run db:reset".',
      );
    }

    for (const versao of sumidas) {
      avisos.push(`Migration aplicada não está mais em migrations/: ${versao} (arquivada?).`);
    }

    for (const versao of semChecksum) {
      await conn.query('UPDATE schema_migrations SET checksum = ? WHERE versao = ?', [
        checksumsAtuais.get(versao),
        versao,
      ]);
      avisos.push(`Checksum registrado agora para migration antiga: ${versao}.`);
    }

    const jaAplicadas = new Set(registradas.map((linha) => linha.versao));
    for (const arquivo of arquivos) {
      if (jaAplicadas.has(arquivo)) continue;
      await aplicar(conn, diretorio, arquivo);
      aplicadas.push(arquivo);
    }
  } finally {
    if (propria) await conn.end();
  }

  return { aplicadas, avisos };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { aplicadas, avisos } = await migrar();
    avisos.forEach((aviso) => console.warn(`Aviso: ${aviso}`));

    if (aplicadas.length === 0) {
      console.log('Nenhuma migration pendente. Banco já está atualizado.');
    } else {
      aplicadas.forEach((arquivo) => console.log(`Aplicada: ${arquivo}`));
      console.log(`\n${aplicadas.length} migration(s) aplicada(s).`);
    }
    process.exit(0);
  } catch (erro) {
    console.error(erro.message);
    process.exit(1);
  }
}
