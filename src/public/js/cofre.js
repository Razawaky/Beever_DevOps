import { abrirPartida, concluirPartida, mostrarErro, mostrarProgresso, salvarProgresso } from './partida.js';

const enunciado = document.getElementById('cofre-enunciado');
const grafico = document.getElementById('cofre-barras');
const linhaDaMeta = document.getElementById('cofre-linha-da-meta');
const legenda = document.getElementById('cofre-legenda');
const historico = document.getElementById('cofre-historico');
const pergunta = document.getElementById('cofre-pergunta');
const regra = document.getElementById('cofre-regra');
const painelDoDeposito = document.getElementById('cofre-deposito');
const botaoTirar = document.getElementById('cofre-tirar');
const botaoColocar = document.getElementById('cofre-colocar');
const botaoConfirmar = document.getElementById('cofre-confirmar');
const rodada = document.getElementById('cofre-rodada');

const ESPACO_SVG = 'http://www.w3.org/2000/svg';
const BASE_DO_GRAFICO = 65;
const ALTURA_UTIL = 60;
const LARGURA_DO_GRAFICO = 120;

let conteudo = null;
let depositos = [];
let cicloAtual = 0;
let depositoAtual = 0;
let saldo = 0;
let escala = 1;
let passo = 1;
let token = null;

function renderUmCiclo(saldoAnterior, deposito) {
  return Math.floor(((saldoAnterior + deposito) * (100 + conteudo.taxaPorCiclo)) / 100);
}

function alturaDaBarra(valor) {
  return Math.max(0, Math.min(ALTURA_UTIL, (valor / escala) * ALTURA_UTIL));
}

function desenharBarra(indiceDoCiclo, valor) {
  const larguraDaFatia = LARGURA_DO_GRAFICO / conteudo.ciclos;
  const altura = alturaDaBarra(valor);
  const barra = document.createElementNS(ESPACO_SVG, 'rect');

  barra.setAttribute('x', String(larguraDaFatia * indiceDoCiclo + larguraDaFatia * 0.2));
  barra.setAttribute('y', String(BASE_DO_GRAFICO - altura));
  barra.setAttribute('width', String(larguraDaFatia * 0.6));
  barra.setAttribute('height', String(altura));
  barra.setAttribute('rx', '1');
  barra.setAttribute('fill', 'currentColor');
  grafico.append(barra);
}

function registrarNoHistorico(indiceDoCiclo, deposito) {
  const linha = document.createElement('tr');
  const celulas = [
    `${conteudo.nomeDoCiclo} ${indiceDoCiclo + 1}`,
    `${deposito} de mel`,
    `${saldo} de mel`,
  ];

  linha.className = 'border-t border-linha';
  celulas.forEach((texto, coluna) => {
    const celula = document.createElement('td');
    celula.className = coluna === 2 ? 'py-1 text-right font-semibold text-tinta' : 'py-1 text-tinta';
    celula.textContent = texto;
    linha.append(celula);
  });
  historico.append(linha);
}

function atualizarLegenda() {
  const faltam = conteudo.meta - saldo;

  legenda.textContent =
    faltam > 0
      ? `Saldo: ${saldo} de mel. Faltam ${faltam} para a meta de ${conteudo.meta}.`
      : `Saldo: ${saldo} de mel. A meta de ${conteudo.meta} já foi batida!`;
}

function atualizarControles() {
  painelDoDeposito.textContent = String(depositoAtual);
  botaoTirar.disabled = depositoAtual - passo < conteudo.minimoPorCiclo;
  botaoColocar.disabled = depositoAtual + passo > conteudo.entradaPorCiclo;
}

function mostrarCiclo() {
  depositoAtual = conteudo.minimoPorCiclo;

  pergunta.textContent = `${conteudo.nomeDoCiclo} ${cicloAtual + 1}: entraram ${conteudo.entradaPorCiclo} de mel. Quanto vai para o cofre?`;
  regra.textContent = `De ${conteudo.minimoPorCiclo} a ${conteudo.entradaPorCiclo}, de ${passo} em ${passo}. O que ficar no cofre rende ${conteudo.taxaPorCiclo}% neste ${conteudo.nomeDoCiclo}.`;
  botaoConfirmar.textContent = cicloAtual === conteudo.ciclos - 1 ? 'Terminar' : 'Guardar';
  mostrarProgresso(`${conteudo.nomeDoCiclo} ${cicloAtual + 1} de ${conteudo.ciclos}`, cicloAtual, conteudo.ciclos);
  atualizarControles();
}

async function terminar() {
  rodada.classList.add('hidden');
  botaoConfirmar.disabled = true;
  botaoConfirmar.textContent = 'Enviando…';

  try {
    await concluirPartida(token, depositos);
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

botaoTirar.addEventListener('click', () => {
  depositoAtual -= passo;
  atualizarControles();
});

botaoColocar.addEventListener('click', () => {
  depositoAtual += passo;
  atualizarControles();
});

function guardarNoCiclo(deposito) {
  depositos.push(deposito);
  saldo = renderUmCiclo(saldo, deposito);
  desenharBarra(cicloAtual, saldo);
  registrarNoHistorico(cicloAtual, deposito);
  atualizarLegenda();
  cicloAtual += 1;
}

botaoConfirmar.addEventListener('click', () => {
  guardarNoCiclo(depositoAtual);
  salvarProgresso(depositos);

  if (cicloAtual < conteudo.ciclos) {
    mostrarCiclo();
    return;
  }
  terminar();
});

async function comecar() {
  try {
    const partida = await abrirPartida();

    token = partida.token;
    conteudo = partida.conteudo;
    depositos = [];
    cicloAtual = 0;
    saldo = 0;
    passo = conteudo.minimoPorCiclo > 0 ? conteudo.minimoPorCiclo : 1;

    escala = 0;
    for (let ciclo = 0; ciclo < conteudo.ciclos; ciclo += 1) {
      escala = renderUmCiclo(escala, conteudo.entradaPorCiclo);
    }

    enunciado.textContent = conteudo.enunciado;
    linhaDaMeta.setAttribute('y1', String(BASE_DO_GRAFICO - alturaDaBarra(conteudo.meta)));
    linhaDaMeta.setAttribute('y2', String(BASE_DO_GRAFICO - alturaDaBarra(conteudo.meta)));
    atualizarLegenda();

    for (const deposito of partida.estado?.respostas ?? []) {
      if (cicloAtual < conteudo.ciclos) guardarNoCiclo(deposito);
    }

    if (cicloAtual >= conteudo.ciclos) {
      terminar();
      return;
    }
    mostrarCiclo();
    enunciado.focus?.();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

comecar();
