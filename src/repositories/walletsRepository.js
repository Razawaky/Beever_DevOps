import { consultar, consultarEm } from '../config/database.js';


export async function criar(idUsuario, conexao = null) {
  const resultado = await consultarEm(conexao, 'INSERT INTO wallets (user_id) VALUES (?)', [idUsuario]);
  return resultado.insertId;
}

export async function buscarPorUsuario(idUsuario) {
  const linhas = await consultar('SELECT id, user_id, coins, points_total FROM wallets WHERE user_id = ?', [
    idUsuario,
  ]);
  return linhas[0] ?? null;
}

async function saldoAtual(conexao, idUsuario, coluna) {
  const [linhas] = await conexao.execute(`SELECT ${coluna} AS saldo FROM wallets WHERE user_id = ?`, [
    idUsuario,
  ]);
  return linhas[0]?.saldo ?? 0;
}

async function lancar(conexao, tabela, { idUsuario, valor, motivo, referenciaTipo, referenciaId, saldoDepois }) {
  const [resultado] = await conexao.execute(
    `INSERT INTO ${tabela} (user_id, amount, reason_id, reference_type, reference_id, balance_after)
     SELECT ?, ?, r.id, ?, ?, ? FROM reward_reasons r WHERE r.slug = ?`,
    [idUsuario, valor, referenciaTipo, referenciaId, saldoDepois, motivo],
  );

  if (resultado.affectedRows === 0) {
    throw new Error(`Motivo de recompensa desconhecido: "${motivo}". Nenhum lançamento foi gravado em ${tabela}.`);
  }
}

export async function debitarMel(conexao, { idUsuario, quantidade, motivo, referenciaTipo = null, referenciaId = null }) {
  const [resultado] = await conexao.execute(
    'UPDATE wallets SET coins = coins - ? WHERE user_id = ? AND coins >= ?',
    [quantidade, idUsuario, quantidade],
  );
  if (resultado.affectedRows === 0) return 0;

  const saldo = await saldoAtual(conexao, idUsuario, 'coins');
  await lancar(conexao, 'coin_ledger', {
    idUsuario,
    valor: -quantidade,
    motivo,
    referenciaTipo,
    referenciaId,
    saldoDepois: saldo,
  });

  return resultado.affectedRows;
}

export async function creditarMel(conexao, { idUsuario, quantidade, motivo, referenciaTipo = null, referenciaId = null }) {
  await conexao.execute('UPDATE wallets SET coins = coins + ? WHERE user_id = ?', [quantidade, idUsuario]);

  const saldo = await saldoAtual(conexao, idUsuario, 'coins');
  await lancar(conexao, 'coin_ledger', {
    idUsuario,
    valor: quantidade,
    motivo,
    referenciaTipo,
    referenciaId,
    saldoDepois: saldo,
  });

  return saldo;
}

export async function creditarPolen(conexao, { idUsuario, quantidade, motivo, referenciaTipo = null, referenciaId = null }) {
  await conexao.execute('UPDATE wallets SET points_total = points_total + ? WHERE user_id = ?', [
    quantidade,
    idUsuario,
  ]);

  const saldo = await saldoAtual(conexao, idUsuario, 'points_total');
  await lancar(conexao, 'point_ledger', {
    idUsuario,
    valor: quantidade,
    motivo,
    referenciaTipo,
    referenciaId,
    saldoDepois: saldo,
  });

  return saldo;
}
