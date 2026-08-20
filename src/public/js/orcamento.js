import { abrirPartida, concluirPartida, mostrarErro, mostrarProgresso, salvarProgresso } from './partida.js';

const enunciado = document.getElementById('orcamento-enunciado');
const painelDoRestante = document.getElementById('orcamento-restante');
const listaDeCategorias = document.getElementById('orcamento-categorias');
const botaoTerminar = document.getElementById('orcamento-terminar');

const CLASSES_DO_BOTAO_DE_PASSO =
  'h-11 w-11 shrink-0 rounded-pilula border-2 border-linha bg-white font-display text-xl text-tinta transition hover:border-ambar focus-visible:outline-[3px] focus-visible:outline-tinta focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40';

let conteudo = null;
let valores = [];
let linhas = [];
let token = null;

function distribuido() {
  return valores.reduce((soma, valor) => soma + valor, 0);
}

function restante() {
  return conteudo.total - distribuido();
}

function mudar(indice, quanto) {
  const novoValor = valores[indice] + quanto;

  if (novoValor < 0 || quanto > restante()) return;

  valores[indice] = novoValor;
  atualizar();
  salvarProgresso(valores);
}

function criarBotaoDePasso(indice, quanto, rotulo) {
  const botao = document.createElement('button');

  botao.type = 'button';
  botao.textContent = quanto > 0 ? '+' : '−';
  botao.className = CLASSES_DO_BOTAO_DE_PASSO;
  botao.setAttribute('aria-label', rotulo);
  botao.addEventListener('click', () => mudar(indice, quanto));
  return botao;
}

function criarLinha(categoria, indice) {
  const item = document.createElement('li');
  const cabecalho = document.createElement('div');
  const nome = document.createElement('p');
  const dica = document.createElement('p');
  const controles = document.createElement('div');
  const valor = document.createElement('p');

  item.className = 'rounded-favo border-2 border-linha bg-white p-4';
  nome.className = 'font-semibold text-tinta';
  nome.textContent = categoria.nome;
  dica.className = 'text-sm text-tinta-suave';
  dica.textContent = categoria.dica ?? '';

  cabecalho.append(nome, dica);

  valor.className = 'min-w-16 text-center font-display text-2xl text-tinta tabular-nums';
  controles.className = 'mt-3 flex items-center justify-between gap-3';
  controles.append(
    criarBotaoDePasso(indice, -conteudo.passo, `Tirar ${conteudo.passo} de ${categoria.nome}`),
    valor,
    criarBotaoDePasso(indice, conteudo.passo, `Colocar ${conteudo.passo} em ${categoria.nome}`),
  );

  item.append(cabecalho, controles);
  linhas.push({ valor, tirar: controles.children[0], colocar: controles.children[2] });
  return item;
}

function atualizar() {
  const sobrando = restante();

  painelDoRestante.textContent =
    sobrando === 0 ? 'Tudo distribuído!' : `Faltam repartir ${sobrando} de ${conteudo.total} de mel`;

  linhas.forEach((linha, indice) => {
    linha.valor.textContent = String(valores[indice]);
    linha.tirar.disabled = valores[indice] === 0;
    linha.colocar.disabled = sobrando < conteudo.passo;
  });

  botaoTerminar.disabled = sobrando !== 0;
  mostrarProgresso(`${distribuido()} de ${conteudo.total} de mel repartido`, distribuido(), conteudo.total);
}

botaoTerminar.addEventListener('click', async () => {
  botaoTerminar.disabled = true;
  botaoTerminar.textContent = 'Enviando…';

  try {
    await concluirPartida(token, valores);
  } catch (erro) {
    mostrarErro(erro.message);
  }
});

async function comecar() {
  try {
    const partida = await abrirPartida();

    token = partida.token;
    conteudo = partida.conteudo;
    valores = partida.estado?.respostas ?? conteudo.categorias.map(() => 0);
    linhas = [];
    enunciado.textContent = conteudo.enunciado;

    listaDeCategorias.replaceChildren(
      ...conteudo.categorias.map((categoria, indice) => criarLinha(categoria, indice)),
    );
    atualizar();
    enunciado.focus?.();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

comecar();
