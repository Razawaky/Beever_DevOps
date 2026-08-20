const etapas = [
  {
    id: 'apelido',
    pergunta: 'Como você quer ser chamado?',
    subtitulo: 'Seu apelido na colmeia.',
    tipo: 'texto',
    placeholder: 'Ex: beeverzinho',
  },
  {
    id: 'dias',
    pergunta: 'Em que dias você vai jogar?',
    subtitulo: 'A colmeia só cobra presença nos dias que você escolher.',
    tipo: 'multipla',
    opcoes: [
      { valor: '1', rotulo: 'Segunda' },
      { valor: '2', rotulo: 'Terça' },
      { valor: '3', rotulo: 'Quarta' },
      { valor: '4', rotulo: 'Quinta' },
      { valor: '5', rotulo: 'Sexta' },
      { valor: '6', rotulo: 'Sábado' },
      { valor: '0', rotulo: 'Domingo' },
    ],
  },
  {
    id: 'tempo',
    pergunta: 'Quanto tempo você quer jogar por vez?',
    subtitulo: 'Dá para mudar depois, no perfil.',
    tipo: 'radio',
  },
  {
    id: 'objetivo',
    pergunta: 'O que você quer conseguir?',
    subtitulo: 'Isso ajuda a escolher suas primeiras metas.',
    tipo: 'select',
  },
  {
    id: 'avatar',
    pergunta: 'Escolha sua abelha',
    subtitulo: 'Dá para trocar depois, no perfil.',
    tipo: 'radio',
  },
  {
    id: 'preferencias',
    pergunta: 'Como você prefere jogar?',
    subtitulo: 'Marque o que quiser. Pode deixar tudo desmarcado.',
    tipo: 'multipla',
    permiteVazio: true,
  },
  {
    id: 'nivel',
    pergunta: 'Quanto você já sabe sobre dinheiro?',
    subtitulo: 'Seja sincero, não vamos julgar!',
    tipo: 'radio',
    opcoes: [
      { valor: 'beginner', rotulo: 'Recém chegado na colmeia (zero)' },
      { valor: 'intermediate', rotulo: 'Já sei voar um pouco (básico)' },
      { valor: 'advanced', rotulo: 'Mestre do mel (avançado)' },
    ],
  },
];

const CLASSES_DA_BARRA = 'h-full bg-mel transition-all duration-500 ease-out';
const CLASSE_CAMPO =
  'w-full rounded-lg border border-linha px-4 py-3 text-lg focus:border-mel focus:outline-[3px] focus:outline-ambar focus:outline-offset-2 focus:ring-2 focus:ring-tinta';
const CLASSE_OPCAO = 'flex cursor-pointer items-center gap-3 rounded-favo border-2 p-4 hover:border-ambar';

const corpo = document.body;
const perfilId = corpo.dataset.perfilId;
const csrfToken = corpo.dataset.csrfToken;

const conteudo = document.getElementById('etapa-conteudo');
const formulario = document.getElementById('form-onboarding');
const botaoAvancar = document.getElementById('btn-avancar');
const botaoVoltar = document.getElementById('btn-voltar');
const barraProgresso = document.getElementById('progress-bar');
const textoProgresso = document.getElementById('progress-text');
const erroEl = document.getElementById('erro-onboarding');

function lerRascunho() {
  try {
    return JSON.parse(corpo.dataset.onboarding || '{}');
  } catch {
    return {};
  }
}

const rascunho = lerRascunho();
const catalogo = rascunho.catalogo ?? {};
const respostas = { ...(rascunho.respostas ?? {}) };
let etapaAtual = Math.min(Math.max(Number(rascunho.passoAtual) || 0, 0), etapas.length - 1);

function opcoesDaEtapa(etapa) {
  return etapa.opcoes ?? catalogo[etapa.id] ?? [];
}

function elemento(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function opcaoMarcavel(tipo, opcao, marcada) {
  const rotulo = elemento('label', `${CLASSE_OPCAO} ${marcada ? 'border-mel bg-cera' : 'border-linha'}`);

  const campo = document.createElement('input');
  campo.type = tipo;
  campo.name = 'campo-etapa';
  campo.value = opcao.valor;
  campo.checked = marcada;
  campo.className = 'h-4 w-4';

  rotulo.append(campo);

  if (opcao.imagem) {
    const figura = document.createElement('img');
    figura.src = opcao.imagem;
    figura.alt = '';
    figura.className = 'h-10 w-10 object-contain';
    rotulo.append(figura);
  }

  rotulo.append(elemento('span', 'font-medium', opcao.rotulo));
  return rotulo;
}

function montarCampo(etapa, valorAtual) {
  if (etapa.tipo === 'texto') {
    const campo = document.createElement('input');
    campo.type = 'text';
    campo.id = 'campo-etapa';
    campo.required = true;
    campo.maxLength = 100;
    campo.className = CLASSE_CAMPO;
    campo.placeholder = etapa.placeholder;
    campo.value = typeof valorAtual === 'string' ? valorAtual : '';
    return campo;
  }

  const opcoes = opcoesDaEtapa(etapa);

  if (etapa.tipo === 'select') {
    const campo = document.createElement('select');
    campo.id = 'campo-etapa';
    campo.required = true;
    campo.className = CLASSE_CAMPO;

    const vazia = elemento('option', null, 'Selecione uma opção...');
    vazia.value = '';
    vazia.disabled = true;
    vazia.selected = !valorAtual;
    campo.append(vazia);

    for (const opcao of opcoes) {
      const item = elemento('option', null, opcao.rotulo);
      item.value = opcao.valor;
      item.selected = valorAtual === opcao.valor;
      campo.append(item);
    }
    return campo;
  }

  const multipla = etapa.tipo === 'multipla';
  const marcados = multipla ? [].concat(valorAtual ?? []).map(String) : [];
  const caixa = elemento('div', multipla ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3');

  for (const opcao of opcoes) {
    const marcada = multipla ? marcados.includes(opcao.valor) : valorAtual === opcao.valor;
    caixa.append(opcaoMarcavel(multipla ? 'checkbox' : 'radio', opcao, marcada));
  }
  return caixa;
}

function rotuloDoBotao() {
  return etapaAtual === etapas.length - 1 ? 'Finalizar' : 'Continuar';
}

function aplicarProgresso(percentual) {
  const limitado = Math.min(100, Math.max(0, Math.round(percentual)));
  barraProgresso.className = `barra-${Math.round(limitado / 5) * 5} ${CLASSES_DA_BARRA}`;
  barraProgresso.setAttribute('aria-valuenow', String(limitado));
  textoProgresso.textContent = `${limitado}%`;
}

function renderizarEtapa() {
  const etapa = etapas[etapaAtual];
  botaoVoltar.classList.toggle('hidden', etapaAtual === 0);
  botaoAvancar.textContent = rotuloDoBotao();
  aplicarProgresso((etapaAtual / etapas.length) * 100);

  conteudo.replaceChildren(
    elemento('h2', 'text-2xl font-bold', etapa.pergunta),
    elemento('p', 'mt-1 mb-6 text-tinta-suave', etapa.subtitulo),
    montarCampo(etapa, respostas[etapa.id]),
  );
}

function lerValorEtapa() {
  const etapa = etapas[etapaAtual];
  if (etapa.tipo === 'multipla') {
    return [...conteudo.querySelectorAll('input[name="campo-etapa"]:checked')].map((campo) => campo.value);
  }
  if (etapa.tipo === 'radio') {
    return conteudo.querySelector('input[name="campo-etapa"]:checked')?.value ?? '';
  }
  return document.getElementById('campo-etapa').value.trim();
}

function mostrarErro(mensagem) {
  erroEl.textContent = mensagem;
  erroEl.classList.remove('hidden');
}

function esconderErro() {
  erroEl.classList.add('hidden');
}

function ocupado(estado) {
  botaoAvancar.disabled = estado;
  botaoAvancar.textContent = estado ? 'Salvando...' : rotuloDoBotao();
}

async function enviar(caminho, dados) {
  const resposta = await fetch(caminho, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-csrf-token': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify(dados),
  });

  const corpoDaResposta = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(corpoDaResposta.erro || 'Não foi possível salvar suas respostas.');
  }
  return corpoDaResposta;
}

async function finalizar() {
  await enviar(`/perfil/${perfilId}/onboarding`, respostas);
  aplicarProgresso(100);
  window.location.href = '/painel';
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  esconderErro();

  const etapa = etapas[etapaAtual];
  const valor = lerValorEtapa();
  const respondeu = Array.isArray(valor) ? valor.length > 0 : Boolean(valor);
  if (!respondeu && !etapa.permiteVazio) {
    mostrarErro('Responda para continuar.');
    return;
  }

  respostas[etapa.id] = valor;
  ocupado(true);

  try {
    if (etapaAtual === etapas.length - 1) {
      await finalizar();
      return;
    }

    const atualizado = await enviar(`/perfil/${perfilId}/onboarding/passo`, {
      passo: etapa.id,
      resposta: valor,
    });

    etapaAtual = Math.min(Number(atualizado.passoAtual) || etapaAtual + 1, etapas.length - 1);
    renderizarEtapa();
  } catch (erro) {
    mostrarErro(erro.message);
  } finally {
    ocupado(false);
  }
});

botaoVoltar.addEventListener('click', () => {
  if (etapaAtual > 0) {
    etapaAtual -= 1;
    esconderErro();
    renderizarEtapa();
  }
});

renderizarEtapa();
