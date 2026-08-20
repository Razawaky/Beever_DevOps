import { abrirPartida, concluirPartida, mostrarErro, mostrarProgresso, salvarProgresso } from './partida.js';

const enunciado = document.getElementById('ordene-enunciado');
const lista = document.getElementById('ordene-itens');
const botaoConfirmar = document.getElementById('ordene-confirmar');
const aviso = document.getElementById('ordene-aviso');

const CLASSES_DA_SETA =
  'h-11 w-11 shrink-0 rounded-pilula border-2 border-linha bg-white font-display text-lg text-tinta transition hover:border-ambar focus-visible:outline-[3px] focus-visible:outline-tinta focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40';

let itens = [];
let token = null;

function anunciar(mensagem) {
  aviso.textContent = mensagem;
}

function mover(posicao, destino) {
  if (destino < 0 || destino >= itens.length) return;

  [itens[posicao], itens[destino]] = [itens[destino], itens[posicao]];
  desenhar();
  salvarProgresso(itens.map((item) => item.id));
  anunciar(`${itens[destino].texto} agora está na posição ${destino + 1} de ${itens.length}.`);

  const direcao = destino < posicao ? 'subir' : 'descer';
  document.querySelector(`[data-${direcao}="${destino}"]`)?.focus();
}

function criarSeta(posicao, direcao) {
  const botao = document.createElement('button');
  const paraCima = direcao === 'subir';

  botao.type = 'button';
  botao.textContent = paraCima ? '↑' : '↓';
  botao.className = CLASSES_DA_SETA;
  botao.dataset[direcao] = String(posicao);
  botao.setAttribute('aria-label', `${paraCima ? 'Subir' : 'Descer'} ${itens[posicao].texto}`);
  botao.disabled = paraCima ? posicao === 0 : posicao === itens.length - 1;
  botao.addEventListener('click', () => mover(posicao, paraCima ? posicao - 1 : posicao + 1));
  return botao;
}

function criarLinha(item, posicao) {
  const linha = document.createElement('li');
  const numero = document.createElement('span');
  const texto = document.createElement('span');
  const setas = document.createElement('div');

  linha.className = 'flex items-center gap-3 rounded-favo border-2 border-linha bg-white p-3';
  numero.className = 'font-display text-xl text-tinta-suave tabular-nums';
  numero.textContent = `${posicao + 1}º`;
  texto.className = 'flex-1 font-medium text-tinta';
  texto.textContent = item.texto;
  setas.className = 'flex shrink-0 gap-2';
  setas.append(criarSeta(posicao, 'subir'), criarSeta(posicao, 'descer'));

  linha.append(numero, texto, setas);
  return linha;
}

function desenhar() {
  lista.replaceChildren(...itens.map((item, posicao) => criarLinha(item, posicao)));
}

botaoConfirmar.addEventListener('click', async () => {
  botaoConfirmar.disabled = true;
  botaoConfirmar.textContent = 'Enviando…';

  try {
    await concluirPartida(token, itens.map((item) => item.id));
  } catch (erro) {
    mostrarErro(erro.message);
  }
});

async function comecar() {
  try {
    const partida = await abrirPartida();

    token = partida.token;
    itens = partida.conteudo.itens;
    const ordemSalva = partida.estado?.respostas;
    if (Array.isArray(ordemSalva) && ordemSalva.length === itens.length) {
      itens = ordemSalva.map((id) => itens.find((item) => item.id === id)).filter(Boolean);
      if (itens.length !== ordemSalva.length) itens = partida.conteudo.itens;
    }
    enunciado.textContent = partida.conteudo.enunciado;

    desenhar();
    mostrarProgresso(`${itens.length} itens para ordenar`, 0, itens.length);
    enunciado.focus?.();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

comecar();
