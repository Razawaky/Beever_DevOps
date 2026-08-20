import { consultar } from '../config/database.js';
import { limiteSeguro } from '../utils/limite.js';


const ATORES = { usuario: 'usuario', admin: 'admin', sistema: 'sistema' };

export async function registrar({
  atorTipo = ATORES.usuario,
  atorId = null,
  acao,
  entidade,
  entidadeId = null,
  estadoAnterior = null,
  estadoNovo = null,
  ipHash = null,
  requestId = null,
}) {
  const resultado = await consultar(
    `INSERT INTO audit_logs (actor_type_id, actor_id, action, entity_type, entity_id,
                             before_state, after_state, ip_hash, request_id)
     SELECT t.id, ?, ?, ?, ?, ?, ?, ?, ? FROM audit_actor_types t WHERE t.slug = ?`,
    [
      atorId,
      acao,
      entidade,
      entidadeId,
      estadoAnterior ? JSON.stringify(estadoAnterior) : null,
      estadoNovo ? JSON.stringify(estadoNovo) : null,
      ipHash,
      requestId,
      atorTipo,
    ],
  );

  if (resultado.affectedRows === 0) {
    throw new Error(`Tipo de ator desconhecido na auditoria: "${atorTipo}". Nada foi registrado.`);
  }
}

export async function listarPorEntidade(entidade, entidadeId, limite = 50) {
  return consultar(
    `SELECT l.id, t.slug AS ator_tipo, l.actor_id, l.action, l.entity_type, l.entity_id,
            l.before_state, l.after_state, l.ip_hash, l.request_id, l.created_at
       FROM audit_logs l
       JOIN audit_actor_types t ON t.id = l.actor_type_id
      WHERE l.entity_type = ? AND l.entity_id = ?
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT ${limiteSeguro(limite)}`,
    [entidade, entidadeId],
  );
}
