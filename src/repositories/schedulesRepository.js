import { consultar, consultarEm } from '../config/database.js';


export async function listarPorUsuario(idUsuario) {
  return consultar(
    `SELECT id, user_id, weekday, is_available
       FROM schedules
      WHERE user_id = ?
      ORDER BY weekday`,
    [idUsuario],
  );
}

export async function diasDisponiveis(idUsuario) {
  const linhas = await consultar(
    'SELECT weekday FROM schedules WHERE user_id = ? AND is_available = 1 ORDER BY weekday',
    [idUsuario],
  );
  return linhas.map((linha) => Number(linha.weekday));
}

export async function definirDia(conexao, { idUsuario, diaSemana, disponivel }) {
  await consultarEm(
    conexao,
    `INSERT INTO schedules (user_id, weekday, is_available)
     VALUES (?, ?, ?) AS novo
     ON DUPLICATE KEY UPDATE is_available = novo.is_available`,
    [idUsuario, diaSemana, disponivel ? 1 : 0],
  );
}

export async function definirSemana(conexao, idUsuario, diasEscolhidos = []) {
  const escolhidos = new Set(diasEscolhidos.map(Number));
  for (let dia = 0; dia <= 6; dia += 1) {
    await definirDia(conexao, { idUsuario, diaSemana: dia, disponivel: escolhidos.has(dia) });
  }
  return escolhidos.size;
}
