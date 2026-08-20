import { consultar, consultarEm } from '../config/database.js';


const CAMPOS =
  'id, user_id, age_band_id, avatar_id, initial_goal_id, onboarding_step, timezone, session_minutes, is_sound_enabled, has_reduced_motion, created_at';

export async function buscarPorUsuario(idUsuario) {
  const linhas = await consultar(`SELECT ${CAMPOS} FROM profiles WHERE user_id = ?`, [idUsuario]);
  return linhas[0] ?? null;
}

export async function buscarPorId(id) {
  const linhas = await consultar(`SELECT ${CAMPOS} FROM profiles WHERE id = ?`, [id]);
  return linhas[0] ?? null;
}

export async function criar({ idUsuario }, conexao = null) {
  const resultado = await consultarEm(conexao, 'INSERT INTO profiles (user_id) VALUES (?)', [idUsuario]);
  return resultado.insertId;
}

function bit(valor) {
  if (valor === null || valor === undefined) return null;
  return valor ? 1 : 0;
}

export async function atualizar(
  id,
  {
    faixaEtaria = null,
    avatar = null,
    objetivoInicial = null,
    fuso = null,
    minutosPorSessao = null,
    somAtivo = null,
    animacaoReduzida = null,
  },
  conexao = null,
) {
  const resultado = await consultarEm(
    conexao,
    `UPDATE profiles
        SET age_band_id        = CASE WHEN ? IS NULL THEN age_band_id     ELSE (SELECT id FROM age_bands     WHERE code = ?) END,
            avatar_id          = CASE WHEN ? IS NULL THEN avatar_id       ELSE (SELECT id FROM avatars       WHERE slug = ?) END,
            initial_goal_id    = CASE WHEN ? IS NULL THEN initial_goal_id ELSE (SELECT id FROM initial_goals WHERE slug = ?) END,
            timezone           = COALESCE(?, timezone),
            session_minutes    = COALESCE(?, session_minutes),
            is_sound_enabled   = COALESCE(?, is_sound_enabled),
            has_reduced_motion = COALESCE(?, has_reduced_motion)
      WHERE id = ?`,
    [
      faixaEtaria,
      faixaEtaria,
      avatar,
      avatar,
      objetivoInicial,
      objetivoInicial,
      fuso,
      minutosPorSessao,
      bit(somAtivo),
      bit(animacaoReduzida),
      id,
    ],
  );
  return resultado.affectedRows;
}

export async function avancarPasso(id, passo, conexao = null) {
  const resultado = await consultarEm(
    conexao,
    'UPDATE profiles SET onboarding_step = GREATEST(onboarding_step, ?) WHERE id = ?',
    [passo, id],
  );
  return resultado.affectedRows;
}

export async function remover(id) {
  const resultado = await consultar('DELETE FROM profiles WHERE id = ?', [id]);
  return resultado.affectedRows;
}

export async function buscarDetalhadoPorUsuario(idUsuario) {
  const linhas = await consultar(
    `SELECT p.id, p.user_id, p.onboarding_step, p.timezone, p.session_minutes, p.is_sound_enabled, p.has_reduced_motion,
            f.code AS faixa_etaria, f.name AS faixa_etaria_nome,
            a.slug AS avatar, a.image_path AS avatar_imagem,
            o.slug AS objetivo_inicial, o.label AS objetivo_inicial_rotulo
       FROM profiles p
       LEFT JOIN age_bands f     ON f.id = p.age_band_id
       LEFT JOIN avatars a       ON a.id = p.avatar_id
       LEFT JOIN initial_goals o ON o.id = p.initial_goal_id
      WHERE p.user_id = ?`,
    [idUsuario],
  );
  return linhas[0] ?? null;
}

export async function listarFaixasEtarias() {
  return consultar(
    'SELECT id, code, name, min_age, max_age, is_economy_enabled, is_upkeep_enabled FROM age_bands ORDER BY min_age',
  );
}

export async function listarAvatares() {
  return consultar('SELECT slug, name, image_path FROM avatars ORDER BY id');
}

export async function listarObjetivosIniciais() {
  return consultar('SELECT slug, label FROM initial_goals ORDER BY id');
}
