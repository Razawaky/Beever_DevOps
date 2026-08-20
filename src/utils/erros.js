export class ErroAplicacao extends Error {
  constructor(mensagem, { status = 400, codigo = 'ERRO_APLICACAO', detalhes = null } = {}) {
    super(mensagem);
    this.name = 'ErroAplicacao';
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
    this.esperado = true;
  }
}

export const erroNaoEncontrado = (mensagem = 'Recurso não encontrado') =>
  new ErroAplicacao(mensagem, { status: 404, codigo: 'NAO_ENCONTRADO' });

export const erroNaoAutorizado = (mensagem = 'É preciso estar logado') =>
  new ErroAplicacao(mensagem, { status: 401, codigo: 'NAO_AUTORIZADO' });

export const erroAcessoNegado = (mensagem = 'Acesso negado') =>
  new ErroAplicacao(mensagem, { status: 403, codigo: 'ACESSO_NEGADO' });

export const erroValidacao = (mensagem = 'Dados inválidos', detalhes = null) =>
  new ErroAplicacao(mensagem, { status: 422, codigo: 'VALIDACAO', detalhes });

export const assincrono = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
