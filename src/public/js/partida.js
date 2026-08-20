import { mostrarResultado } from './resultado.js';

const carregando = document.getElementById('jogo-carregando');
const aviso = document.getElementById('jogo-erro');
const area = document.getElementById('jogo-area');
const avisoDeRepeticao = document.getElementById('jogo-repeticao');
const painelDePasso = document.getElementById('jogo-passo');
const barra = document.getElementById('jogo-barra');
const barraCaixa = document.getElementById('jogo-barra-caixa');

const csrfToken = document.body.dataset.csrfToken;
const idCelula = Number(document.body.dataset.celulaId);

async function pedir(caminho, corpo, metodo = 'POST') {
  const resposta = await fetch(caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-csrf-token': csrfToken },
    credentials: 'include',
    body: JSON.stringify(corpo),
  });

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro ?? 'Não foi possível continuar a atividade.');
  return dados;
}

export function mostrarErro(mensagem) {
  carregando.classList.add('hidden');
  area.classList.add('hidden');
  aviso.textContent = mensagem;
  aviso.classList.remove('hidden');
}

export function mostrarProgresso(texto, feitas, total) {
  const porcento = Math.round((feitas / total) * 100);
  const passo = Math.round(porcento / 5) * 5;

  painelDePasso.textContent = texto;
  barra.className = `h-full rounded-pilula bg-mel barra-${passo}`;
  barraCaixa.setAttribute('aria-valuenow', String(porcento));
}

let tokenDaPartida = null;

export async function abrirPartida() {
  const partida = await pedir('/partidas', { idCelula });

  tokenDaPartida = partida.token;
  if (partida.ehRepeticao) avisoDeRepeticao.classList.remove('hidden');
  carregando.classList.add('hidden');
  area.classList.remove('hidden');
  return partida;
}

export function salvarProgresso(respostasParciais) {
  return pedir(`/partidas/${tokenDaPartida}/estado`, { respostas: respostasParciais }, 'PUT').catch(() => false);
}

export async function concluirPartida(token, respostas) {
  const dados = await pedir(`/partidas/${token}/resultado`, { respostas });

  area.classList.add('hidden');
  mostrarResultado(dados);
}
