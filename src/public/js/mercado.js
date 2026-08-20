import { abrirPartida, concluirPartida, mostrarErro, mostrarProgresso, salvarProgresso } from './partida.js';

const enunciado = document.getElementById('mercado-enunciado');
const listaDeOpcoes = document.getElementById('mercado-opcoes');
const botaoConfirmar = document.getElementById('mercado-confirmar');

const CLASSES_DA_OPCAO =
  'w-full rounded-favo border-2 border-linha bg-white px-4 py-3 text-left font-medium text-tinta transition hover:border-ambar focus-visible:outline-[3px] focus-visible:outline-tinta focus-visible:outline-offset-2';

let rodadas = [];
let respostas = [];
let indiceAtual = 0;
let escolhaAtual = null;
let token = null;

function marcarEscolhida(botaoEscolhido) {
  for (const botao of listaDeOpcoes.querySelectorAll('button')) {
    const escolhido = botao === botaoEscolhido;
    botao.setAttribute('aria-pressed', String(escolhido));
    botao.className = escolhido ? `${CLASSES_DA_OPCAO} border-mel bg-cera` : CLASSES_DA_OPCAO;
  }
}

function criarOpcao(opcao, indice, unidade) {
  const item = document.createElement('li');
  const botao = document.createElement('button');
  const nome = document.createElement('span');
  const detalhe = document.createElement('span');

  nome.className = 'block';
  nome.textContent = opcao.texto;
  detalhe.className = 'block text-sm text-tinta-suave';
  detalhe.textContent = `${opcao.preco} de mel por ${opcao.quantidade} ${unidade}`;

  botao.type = 'button';
  botao.className = CLASSES_DA_OPCAO;
  botao.setAttribute('aria-pressed', 'false');
  botao.append(nome, detalhe);
  botao.addEventListener('click', () => {
    escolhaAtual = indice;
    botaoConfirmar.disabled = false;
    marcarEscolhida(botao);
  });

  item.append(botao);
  return item;
}

function mostrarRodada() {
  const rodada = rodadas[indiceAtual];

  escolhaAtual = null;
  botaoConfirmar.disabled = true;
  botaoConfirmar.textContent = indiceAtual === rodadas.length - 1 ? 'Terminar' : 'Confirmar';
  enunciado.textContent = rodada.enunciado;
  mostrarProgresso(`Compra ${indiceAtual + 1} de ${rodadas.length}`, indiceAtual, rodadas.length);

  listaDeOpcoes.replaceChildren(
    ...rodada.opcoes.map((opcao, indice) => criarOpcao(opcao, indice, rodada.unidade)),
  );
  enunciado.focus?.();
}

async function terminar() {
  botaoConfirmar.disabled = true;
  botaoConfirmar.textContent = 'Enviando…';

  try {
    await concluirPartida(token, respostas);
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

botaoConfirmar.addEventListener('click', () => {
  if (escolhaAtual === null) return;

  respostas[indiceAtual] = escolhaAtual;
  indiceAtual += 1;
  salvarProgresso(respostas);

  if (indiceAtual < rodadas.length) {
    mostrarRodada();
    return;
  }
  terminar();
});

async function comecar() {
  try {
    const partida = await abrirPartida();

    token = partida.token;
    rodadas = partida.conteudo.rodadas;
    respostas = partida.estado?.respostas ?? [];
    indiceAtual = Math.min(respostas.length, rodadas.length - 1);
    mostrarRodada();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

comecar();
