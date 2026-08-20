import { abrirPartida, concluirPartida, mostrarErro, mostrarProgresso, salvarProgresso } from './partida.js';

const enunciado = document.getElementById('arraste-enunciado');
const monte = document.getElementById('arraste-monte');
const painelDeCaixas = document.getElementById('arraste-caixas');
const botaoTerminar = document.getElementById('arraste-terminar');
const aviso = document.getElementById('arraste-aviso');

const CLASSES_DA_CARTA =
  'w-full cursor-pointer rounded-favo border-2 border-linha bg-white px-4 py-3 text-left font-medium text-tinta transition hover:border-ambar focus-visible:outline-[3px] focus-visible:outline-tinta focus-visible:outline-offset-2';
const CLASSES_DA_CAIXA = 'rounded-favo border-2 border-linha bg-white p-4 transition';
const CLASSES_DO_BOTAO_SOLTAR =
  'mt-3 w-full rounded-pilula border-2 border-linha px-3 py-2 text-sm font-semibold text-tinta transition hover:border-ambar focus-visible:outline-[3px] focus-visible:outline-tinta focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40';

let cartas = [];
let categorias = [];
let caixaDaCarta = [];
let cartaSelecionada = null;
let token = null;

function nomeDaCaixa(idDaCaixa) {
  return categorias.find((categoria) => categoria.id === idDaCaixa)?.nome ?? '';
}

function anunciar(mensagem) {
  aviso.textContent = mensagem;
}

function cartasColocadas() {
  return caixaDaCarta.filter((caixa) => caixa !== null).length;
}

function atualizarProgresso() {
  const colocadas = cartasColocadas();

  mostrarProgresso(`${colocadas} de ${cartas.length} cartas classificadas`, colocadas, cartas.length);
  botaoTerminar.disabled = colocadas < cartas.length;
}

function selecionar(indiceDaCarta) {
  cartaSelecionada = cartaSelecionada === indiceDaCarta ? null : indiceDaCarta;
  desenhar();

  document.querySelector(`[data-carta="${indiceDaCarta}"]`)?.focus();

  if (cartaSelecionada === null) return;
  anunciar(`Carta "${cartas[cartaSelecionada].texto}" escolhida. Agora escolha uma caixa.`);
}

function colocar(indiceDaCarta, idDaCaixa) {
  if (!cartas[indiceDaCarta]) return;

  caixaDaCarta[indiceDaCarta] = idDaCaixa;
  cartaSelecionada = null;
  anunciar(`Carta "${cartas[indiceDaCarta].texto}" foi para a caixa ${nomeDaCaixa(idDaCaixa)}.`);
  desenhar();
  atualizarProgresso();
  salvarProgresso(caixaDaCarta);

  const proximaCarta = monte.querySelector('button');
  (proximaCarta ?? botaoTerminar).focus();
}

function criarCarta(indiceDaCarta) {
  const botao = document.createElement('button');
  const escolhida = cartaSelecionada === indiceDaCarta;

  botao.type = 'button';
  botao.textContent = cartas[indiceDaCarta].texto;
  botao.className = escolhida ? `${CLASSES_DA_CARTA} border-mel bg-cera` : CLASSES_DA_CARTA;
  botao.draggable = true;
  botao.dataset.carta = String(indiceDaCarta);
  botao.setAttribute('aria-pressed', String(escolhida));
  botao.addEventListener('click', () => selecionar(indiceDaCarta));

  botao.addEventListener('dragstart', (evento) => {
    cartaSelecionada = indiceDaCarta;
    evento.dataTransfer.setData('text/plain', String(indiceDaCarta));
    evento.dataTransfer.effectAllowed = 'move';
  });

  return botao;
}

function criarCaixa(categoria) {
  const secao = document.createElement('section');
  const titulo = document.createElement('h3');
  const lista = document.createElement('ul');
  const botaoSoltar = document.createElement('button');

  secao.className = CLASSES_DA_CAIXA;
  titulo.className = 'font-display text-lg text-tinta';
  titulo.textContent = categoria.nome;
  lista.className = 'mt-3 flex min-h-16 flex-col gap-2';

  cartas.forEach((carta, indice) => {
    if (caixaDaCarta[indice] !== categoria.id) return;
    const item = document.createElement('li');
    item.append(criarCarta(indice));
    lista.append(item);
  });

  botaoSoltar.type = 'button';
  botaoSoltar.textContent = 'Colocar aqui';
  botaoSoltar.className = CLASSES_DO_BOTAO_SOLTAR;
  botaoSoltar.disabled = cartaSelecionada === null;
  botaoSoltar.addEventListener('click', () => colocar(cartaSelecionada, categoria.id));

  secao.addEventListener('dragover', (evento) => {
    evento.preventDefault();
    secao.className = `${CLASSES_DA_CAIXA} border-mel bg-cera`;
  });
  secao.addEventListener('dragleave', () => {
    secao.className = CLASSES_DA_CAIXA;
  });
  secao.addEventListener('drop', (evento) => {
    evento.preventDefault();
    colocar(Number(evento.dataTransfer.getData('text/plain')), categoria.id);
  });

  secao.append(titulo, lista, botaoSoltar);
  return secao;
}

function desenhar() {
  monte.replaceChildren();
  cartas.forEach((carta, indice) => {
    if (caixaDaCarta[indice] !== null) return;
    const item = document.createElement('li');
    item.append(criarCarta(indice));
    monte.append(item);
  });

  painelDeCaixas.replaceChildren();
  for (const categoria of categorias) painelDeCaixas.append(criarCaixa(categoria));
}

botaoTerminar.addEventListener('click', async () => {
  botaoTerminar.disabled = true;
  botaoTerminar.textContent = 'Enviando…';

  try {
    await concluirPartida(token, caixaDaCarta);
  } catch (erro) {
    mostrarErro(erro.message);
  }
});

async function comecar() {
  try {
    const partida = await abrirPartida();

    token = partida.token;
    cartas = partida.conteudo.cartas;
    categorias = partida.conteudo.categorias;
    caixaDaCarta = partida.estado?.respostas ?? cartas.map(() => null);
    enunciado.textContent = partida.conteudo.enunciado;

    desenhar();
    atualizarProgresso();
    enunciado.focus?.();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

comecar();
