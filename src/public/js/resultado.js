const secao = document.getElementById('jogo-resultado');
const mascote = document.getElementById('jogo-mascote');
const titulo = document.getElementById('jogo-resultado-titulo');
const painelDeEstrelas = document.getElementById('jogo-estrelas');
const avisoDeNivel = document.getElementById('jogo-nivel');
const avisoDeRepeticao = document.getElementById('jogo-repeticao-aviso');
const botaoContinuar = document.getElementById('jogo-continuar');
const linkDoFavo = document.getElementById('jogo-voltar-ao-favo');

const MASCOTES = {
  comemorando: { imagem: '/img/beenie_howdy.png', alt: 'Beenie comemorando', titulo: 'Muito bem!' },
  animando: { imagem: '/img/beenie_vem.png', alt: 'Beenie chamando para tentar de novo', titulo: 'Boa tentativa!' },
};

const ESPACO_SVG = 'http://www.w3.org/2000/svg';
const CONTORNO_DA_ESTRELA =
  'M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.35 6.2 20.4l1.1-6.45-4.7-4.6 6.5-.95L12 2.5z';

function mostrarEstrelas(estrelas) {
  painelDeEstrelas.replaceChildren();
  painelDeEstrelas.setAttribute('aria-label', `${estrelas} de 3 estrelas`);

  for (let posicao = 1; posicao <= 3; posicao += 1) {
    const ganha = posicao <= estrelas;
    const desenho = document.createElementNS(ESPACO_SVG, 'svg');
    const contorno = document.createElementNS(ESPACO_SVG, 'path');

    contorno.setAttribute('d', CONTORNO_DA_ESTRELA);
    contorno.setAttribute('fill', 'currentColor');
    desenho.setAttribute(
      'class',
      ganha ? `estrela estrela-ganha estrela-${posicao} h-10 w-10 text-mel` : 'estrela h-10 w-10 text-linha',
    );
    desenho.setAttribute('viewBox', '0 0 24 24');
    desenho.setAttribute('aria-hidden', 'true');
    desenho.setAttribute('focusable', 'false');
    desenho.append(contorno);
    painelDeEstrelas.append(desenho);
  }
}

function mostrarGanhos(dados) {
  document.getElementById('jogo-xp').textContent = `+${dados.xp}`;
  document.getElementById('jogo-polen').textContent = `+${dados.polen}`;
  document.getElementById('jogo-mel').textContent = `+${dados.mel + dados.bonusDeMelPorNivel}`;

  if (dados.subiuDeNivel) {
    avisoDeNivel.textContent = `Você chegou ao nível ${dados.nivel}! Bônus de ${dados.bonusDeMelPorNivel} de mel.`;
    avisoDeNivel.classList.remove('hidden');
  }
  if (dados.ehRepeticao) avisoDeRepeticao.classList.remove('hidden');
}

function mostrarCaminho(proximaCelula) {
  if (!proximaCelula) return;

  botaoContinuar.href = `/trilha/${proximaCelula.idFavo}/celula/${proximaCelula.id}`;
  botaoContinuar.textContent = `Continuar: ${proximaCelula.titulo}`;
  linkDoFavo.classList.remove('hidden');
}

export function mostrarResultado(dados) {
  const mascoteEscolhido = dados.estrelas === 3 ? MASCOTES.comemorando : MASCOTES.animando;

  mascote.src = mascoteEscolhido.imagem;
  mascote.alt = mascoteEscolhido.alt;
  titulo.textContent = mascoteEscolhido.titulo;

  mostrarEstrelas(dados.estrelas);
  mostrarGanhos(dados);
  mostrarCaminho(dados.proximaCelula);

  secao.classList.remove('hidden');
  titulo.focus?.();
}
