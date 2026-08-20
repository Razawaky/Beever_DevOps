import 'dotenv/config';


const obrigatorias = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'SESSION_SECRET'];

const faltando = obrigatorias.filter((chave) => !process.env[chave]);
if (faltando.length > 0) {
  throw new Error(
    `Variáveis de ambiente obrigatórias ausentes: ${faltando.join(', ')}. ` +
      'Copie o .env.example para .env e preencha os valores.'
  );
}

function inteiro(valor, padrao) {
  const numero = Number.parseInt(valor ?? '', 10);
  return Number.isNaN(numero) ? padrao : numero;
}

const ambiente = process.env.NODE_ENV ?? 'development';

export const env = {
  ambiente,
  producao: ambiente === 'production',
  teste: ambiente === 'test',
  porta: inteiro(process.env.PORT, 3000),

  banco: {
    host: process.env.DB_HOST,
    porta: inteiro(process.env.DB_PORT, 3306),
    usuario: process.env.DB_USER,
    senha: process.env.DB_PASSWORD,
    nome: process.env.DB_NAME,
    limitePool: inteiro(process.env.DB_POOL_LIMIT, 10),
  },

  sessao: {
    segredo: process.env.SESSION_SECRET,
    duracaoMs: inteiro(process.env.SESSION_MAX_AGE_MINUTES, 20) * 60 * 1000,
  },

  log: {
    nivel: process.env.LOG_LEVEL ?? (ambiente === 'production' ? 'info' : 'debug'),
  },
};

if (env.producao && env.sessao.segredo.startsWith('troque-este-segredo')) {
  throw new Error('SESSION_SECRET ainda está com o valor de exemplo. Gere um segredo real para produção.');
}
