import { abrirPartida, concluirPartida, mostrarErro, mostrarProgresso, salvarProgresso } from './partida.js';

const enunciado = document.getElementById('quiz-enunciado');
const listaDeAlternativas = document.getElementById('quiz-alternativas');
const botaoConfirmar = document.getElementById('quiz-confirmar');

const CLASSES_DA_ALTERNATIVA =
  'w-full rounded-favo border-2 border-linha bg-white px-4 py-3 text-left font-medium text-tinta transition hover:border-ambar focus-visible:outline-[3px] focus-visible:outline-tinta focus-visible:outline-offset-2';

let perguntas = [];
let respostas = [];
let indiceAtual = 0;
let escolhaAtual = null;
let token = null;

function marcarEscolhida(botaoEscolhido) {
  for (const botao of listaDeAlternativas.querySelectorAll('button')) {
    const escolhido = botao === botaoEscolhido;
    botao.setAttribute('aria-pressed', String(escolhido));
    botao.className = escolhido
      ? `${CLASSES_DA_ALTERNATIVA} border-mel bg-cera`
      : CLASSES_DA_ALTERNATIVA;
  }
}

function mostrarPergunta() {
  const pergunta = perguntas[indiceAtual];

  escolhaAtual = null;
  botaoConfirmar.disabled = true;
  botaoConfirmar.textContent = indiceAtual === perguntas.length - 1 ? 'Terminar' : 'Confirmar';
  enunciado.textContent = pergunta.enunciado;
  listaDeAlternativas.replaceChildren();
  mostrarProgresso(`Pergunta ${indiceAtual + 1} de ${perguntas.length}`, indiceAtual, perguntas.length);

  pergunta.alternativas.forEach((alternativa, indice) => {
    const item = document.createElement('li');
    const botao = document.createElement('button');

    botao.type = 'button';
    botao.textContent = alternativa;
    botao.className = CLASSES_DA_ALTERNATIVA;
    botao.setAttribute('aria-pressed', 'false');
    botao.addEventListener('click', () => {
      escolhaAtual = indice;
      botaoConfirmar.disabled = false;
      marcarEscolhida(botao);
    });

    item.append(botao);
    listaDeAlternativas.append(item);
  });

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

  if (indiceAtual < perguntas.length) {
    mostrarPergunta();
    return;
  }
  terminar();
});

async function comecar() {
  try {
    const partida = await abrirPartida();

    token = partida.token;
    perguntas = partida.conteudo.perguntas;
    respostas = partida.estado?.respostas ?? [];
    indiceAtual = Math.min(respostas.length, perguntas.length - 1);
    mostrarPergunta();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

comecar();
