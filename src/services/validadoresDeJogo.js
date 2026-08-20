import { erroValidacao } from '../utils/erros.js';


const quiz = {
  conferirForma(corpo) {
    const perguntas = corpo?.perguntas;
    if (!Array.isArray(perguntas) || perguntas.length === 0) {
      throw erroValidacao('Esta célula ainda não é jogável: o conteúdo não tem gabarito');
    }

    for (const pergunta of perguntas) {
      if (!Array.isArray(pergunta.alternativas) || pergunta.alternativas.length < 2) {
        throw erroValidacao('Pergunta sem alternativas suficientes: o conteúdo está incompleto');
      }
      const foraDaLista = pergunta.correta < 0 || pergunta.correta >= pergunta.alternativas.length;
      if (!Number.isInteger(pergunta.correta) || foraDaLista) {
        throw erroValidacao('Pergunta com resposta certa fora das alternativas');
      }
    }
  },

  paraJogar(corpo) {
    return {
      tipo: corpo.tipo,
      perguntas: corpo.perguntas.map((pergunta) => ({
        enunciado: pergunta.enunciado,
        alternativas: pergunta.alternativas,
      })),
    };
  },

  validar(corpo, respostas) {
    if (!Array.isArray(respostas)) {
      throw erroValidacao('As respostas precisam vir em lista, uma por pergunta');
    }

    let erros = 0;
    corpo.perguntas.forEach((pergunta, indice) => {
      if (Number(respostas[indice]) !== Number(pergunta.correta)) erros += 1;
    });

    return { erros, total: corpo.perguntas.length };
  },
};

const arraste = {
  conferirForma(corpo) {
    const categorias = corpo?.categorias;
    const cartas = corpo?.cartas;

    if (!Array.isArray(categorias) || categorias.length < 2) {
      throw erroValidacao('Esta célula ainda não é jogável: precisa de pelo menos duas caixas');
    }
    if (!Array.isArray(cartas) || cartas.length === 0) {
      throw erroValidacao('Esta célula ainda não é jogável: o conteúdo não tem cartas');
    }

    const idsDasCategorias = new Set();
    for (const categoria of categorias) {
      if (typeof categoria.id !== 'string' || categoria.id === '' || !categoria.nome) {
        throw erroValidacao('Caixa sem identificador ou sem nome');
      }
      if (idsDasCategorias.has(categoria.id)) {
        throw erroValidacao('Duas caixas com o mesmo identificador');
      }
      idsDasCategorias.add(categoria.id);
    }

    for (const carta of cartas) {
      if (!carta.texto) throw erroValidacao('Carta sem texto');
      if (!idsDasCategorias.has(carta.categoria)) {
        throw erroValidacao('Carta com resposta certa fora das caixas');
      }
    }
  },

  paraJogar(corpo) {
    return {
      tipo: corpo.tipo,
      enunciado: corpo.enunciado,
      categorias: corpo.categorias.map((categoria) => ({ id: categoria.id, nome: categoria.nome })),
      cartas: corpo.cartas.map((carta) => ({ texto: carta.texto })),
    };
  },

  validar(corpo, respostas) {
    if (!Array.isArray(respostas)) {
      throw erroValidacao('As respostas precisam vir em lista, uma por carta');
    }

    let erros = 0;
    corpo.cartas.forEach((carta, indice) => {
      if (respostas[indice] !== carta.categoria) erros += 1;
    });

    return { erros, total: corpo.cartas.length };
  },
};

const orcamento = {
  conferirForma(corpo) {
    const categorias = corpo?.categorias;

    if (!Number.isInteger(corpo?.total) || corpo.total <= 0) {
      throw erroValidacao('Esta célula ainda não é jogável: o orçamento não tem total');
    }
    if (!Number.isInteger(corpo?.passo) || corpo.passo <= 0 || corpo.total % corpo.passo !== 0) {
      throw erroValidacao('O passo precisa ser inteiro e caber no total um número exato de vezes');
    }
    if (!Array.isArray(categorias) || categorias.length < 2) {
      throw erroValidacao('Esta célula ainda não é jogável: precisa de pelo menos duas categorias');
    }

    const idsDasCategorias = new Set();
    let somaDosMinimos = 0;
    let somaDosMaximos = 0;

    for (const categoria of categorias) {
      if (typeof categoria.id !== 'string' || categoria.id === '' || !categoria.nome) {
        throw erroValidacao('Categoria sem identificador ou sem nome');
      }
      if (idsDasCategorias.has(categoria.id)) {
        throw erroValidacao('Duas categorias com o mesmo identificador');
      }
      idsDasCategorias.add(categoria.id);

      const faixaTorta =
        !Number.isInteger(categoria.minimo) ||
        !Number.isInteger(categoria.maximo) ||
        categoria.minimo < 0 ||
        categoria.maximo < categoria.minimo ||
        categoria.maximo > corpo.total;
      if (faixaTorta) throw erroValidacao(`A faixa da categoria "${categoria.nome}" não faz sentido`);

      somaDosMinimos += categoria.minimo;
      somaDosMaximos += categoria.maximo;
    }

    if (somaDosMinimos > corpo.total || somaDosMaximos < corpo.total) {
      throw erroValidacao('As regras deste orçamento não fecham: nenhuma divisão as respeita');
    }
  },

  paraJogar(corpo) {
    return {
      tipo: corpo.tipo,
      enunciado: corpo.enunciado,
      total: corpo.total,
      passo: corpo.passo,
      categorias: corpo.categorias.map((categoria) => ({
        id: categoria.id,
        nome: categoria.nome,
        minimo: categoria.minimo,
        maximo: categoria.maximo,
        dica: categoria.dica ?? null,
      })),
    };
  },

  validar(corpo, respostas) {
    if (!Array.isArray(respostas)) {
      throw erroValidacao('As respostas precisam vir em lista, uma por categoria');
    }

    let erros = 0;
    let distribuido = 0;

    corpo.categorias.forEach((categoria, indice) => {
      const valor = Number(respostas[indice]);
      if (!Number.isInteger(valor) || valor < categoria.minimo || valor > categoria.maximo) {
        erros += 1;
        if (Number.isInteger(valor) && valor > 0) distribuido += valor;
        return;
      }
      distribuido += valor;
    });

    if (distribuido !== corpo.total) erros += 1;

    return { erros, total: corpo.categorias.length + 1 };
  },
};

function saldoDoCofre(corpo, depositos) {
  let saldo = 0;

  for (let ciclo = 0; ciclo < corpo.ciclos; ciclo += 1) {
    saldo = Math.floor(((saldo + depositos[ciclo]) * (100 + corpo.taxaPorCiclo)) / 100);
  }
  return saldo;
}

const cofre = {
  conferirForma(corpo) {
    const inteiroPositivo = (valor) => Number.isInteger(valor) && valor > 0;

    if (!inteiroPositivo(corpo?.entradaPorCiclo) || !inteiroPositivo(corpo?.meta)) {
      throw erroValidacao('Esta célula ainda não é jogável: falta a entrada por ciclo ou a meta');
    }
    if (!Number.isInteger(corpo.taxaPorCiclo) || corpo.taxaPorCiclo <= 0 || corpo.taxaPorCiclo > 100) {
      throw erroValidacao('A taxa por ciclo precisa ser um percentual inteiro entre 1 e 100');
    }
    if (!Number.isInteger(corpo.ciclos) || corpo.ciclos < 2 || corpo.ciclos > 6) {
      throw erroValidacao('O cofre precisa ter de dois a seis ciclos');
    }
    if (
      !Number.isInteger(corpo.minimoPorCiclo) ||
      corpo.minimoPorCiclo < 0 ||
      corpo.minimoPorCiclo > corpo.entradaPorCiclo
    ) {
      throw erroValidacao('O mínimo por ciclo precisa caber na entrada do ciclo');
    }

    const ciclos = Array.from({ length: corpo.ciclos });
    const saldoGuardandoTudo = saldoDoCofre(corpo, ciclos.map(() => corpo.entradaPorCiclo));
    const saldoGuardandoOMinimo = saldoDoCofre(corpo, ciclos.map(() => corpo.minimoPorCiclo));

    if (corpo.meta > saldoGuardandoTudo) {
      throw erroValidacao('A meta deste cofre é inalcançável: nem guardando tudo o saldo chega lá');
    }
    if (corpo.meta <= saldoGuardandoOMinimo) {
      throw erroValidacao('A meta deste cofre já é alcançada guardando o mínimo: não há decisão a tomar');
    }
  },

  paraJogar(corpo) {
    return {
      tipo: corpo.tipo,
      enunciado: corpo.enunciado,
      nomeDoCiclo: corpo.nomeDoCiclo ?? 'ciclo',
      entradaPorCiclo: corpo.entradaPorCiclo,
      minimoPorCiclo: corpo.minimoPorCiclo,
      taxaPorCiclo: corpo.taxaPorCiclo,
      ciclos: corpo.ciclos,
      meta: corpo.meta,
    };
  },

  validar(corpo, respostas) {
    if (!Array.isArray(respostas)) {
      throw erroValidacao('As respostas precisam vir em lista, uma por ciclo');
    }

    let erros = 0;
    const depositos = [];

    for (let ciclo = 0; ciclo < corpo.ciclos; ciclo += 1) {
      const deposito = Number(respostas[ciclo]);
      const foraDaRegra =
        !Number.isInteger(deposito) || deposito < corpo.minimoPorCiclo || deposito > corpo.entradaPorCiclo;

      if (foraDaRegra) erros += 1;
      depositos.push(foraDaRegra ? 0 : deposito);
    }

    if (saldoDoCofre(corpo, depositos) < corpo.meta) erros += 1;

    return { erros, total: corpo.ciclos + 1 };
  },
};

function precoPorUnidade(opcao) {
  return opcao.preco / opcao.quantidade;
}

function indiceDaMelhorCompra(opcoes) {
  let melhor = 0;
  let empatada = false;

  opcoes.forEach((opcao, indice) => {
    if (indice === 0) return;
    if (precoPorUnidade(opcao) < precoPorUnidade(opcoes[melhor])) {
      melhor = indice;
      empatada = false;
      return;
    }
    if (precoPorUnidade(opcao) === precoPorUnidade(opcoes[melhor])) empatada = true;
  });

  return empatada ? -1 : melhor;
}

const mercado = {
  conferirForma(corpo) {
    const rodadas = corpo?.rodadas;
    if (!Array.isArray(rodadas) || rodadas.length === 0) {
      throw erroValidacao('Esta célula ainda não é jogável: o conteúdo não tem rodadas');
    }

    for (const rodada of rodadas) {
      if (!Array.isArray(rodada.opcoes) || rodada.opcoes.length < 2) {
        throw erroValidacao('Rodada com menos de duas opções: não há o que comparar');
      }
      for (const opcao of rodada.opcoes) {
        const numerosTortos =
          !Number.isFinite(opcao.preco) || opcao.preco <= 0 || !Number.isFinite(opcao.quantidade) || opcao.quantidade <= 0;
        if (!opcao.texto || numerosTortos) {
          throw erroValidacao('Opção sem texto, sem preço ou sem quantidade válida');
        }
      }
      if (indiceDaMelhorCompra(rodada.opcoes) === -1) {
        throw erroValidacao('Rodada com empate na melhor compra: não existe resposta única');
      }
    }
  },

  paraJogar(corpo) {
    return {
      tipo: corpo.tipo,
      rodadas: corpo.rodadas.map((rodada) => ({
        enunciado: rodada.enunciado,
        unidade: rodada.unidade ?? 'unidade',
        opcoes: rodada.opcoes.map((opcao) => ({
          texto: opcao.texto,
          preco: opcao.preco,
          quantidade: opcao.quantidade,
        })),
      })),
    };
  },

  validar(corpo, respostas) {
    if (!Array.isArray(respostas)) {
      throw erroValidacao('As respostas precisam vir em lista, uma por rodada');
    }

    let erros = 0;
    corpo.rodadas.forEach((rodada, indice) => {
      if (Number(respostas[indice]) !== indiceDaMelhorCompra(rodada.opcoes)) erros += 1;
    });

    return { erros, total: corpo.rodadas.length };
  },
};

const ordene = {
  conferirForma(corpo) {
    const itens = corpo?.itens;
    if (!Array.isArray(itens) || itens.length < 3) {
      throw erroValidacao('Esta célula ainda não é jogável: ordenar pede pelo menos três itens');
    }

    const ids = new Set();
    const ordens = new Set();

    for (const item of itens) {
      if (typeof item.id !== 'string' || item.id === '' || !item.texto) {
        throw erroValidacao('Item sem identificador ou sem texto');
      }
      if (ids.has(item.id)) throw erroValidacao('Dois itens com o mesmo identificador');
      if (!Number.isInteger(item.ordem) || item.ordem < 1 || item.ordem > itens.length) {
        throw erroValidacao(`A ordem do item "${item.texto}" está fora da lista`);
      }
      if (ordens.has(item.ordem)) throw erroValidacao('Dois itens disputando a mesma posição');
      ids.add(item.id);
      ordens.add(item.ordem);
    }
  },

  paraJogar(corpo) {
    const itens = corpo.itens.map((item) => ({ id: item.id, texto: item.texto }));

    for (let posicao = itens.length - 1; posicao > 0; posicao -= 1) {
      const sorteada = Math.floor(Math.random() * (posicao + 1));
      [itens[posicao], itens[sorteada]] = [itens[sorteada], itens[posicao]];
    }

    return { tipo: corpo.tipo, enunciado: corpo.enunciado, itens };
  },

  validar(corpo, respostas) {
    if (!Array.isArray(respostas)) {
      throw erroValidacao('As respostas precisam vir em lista, uma posição por item');
    }

    const posicaoEscolhida = new Map(respostas.map((id, posicao) => [id, posicao]));
    const naOrdemCerta = [...corpo.itens].sort((um, outro) => um.ordem - outro.ordem);

    let erros = 0;
    let pares = 0;

    for (let primeiro = 0; primeiro < naOrdemCerta.length; primeiro += 1) {
      for (let segundo = primeiro + 1; segundo < naOrdemCerta.length; segundo += 1) {
        pares += 1;
        const posicaoDoPrimeiro = posicaoEscolhida.get(naOrdemCerta[primeiro].id) ?? Infinity;
        const posicaoDoSegundo = posicaoEscolhida.get(naOrdemCerta[segundo].id) ?? Infinity;
        if (posicaoDoPrimeiro >= posicaoDoSegundo) erros += 1;
      }
    }

    return { erros, total: pares };
  },
};

const VALIDADORES = {
  'quiz-do-favo': quiz,
  'arraste-e-classifique': arraste,
  'monte-o-orcamento': orcamento,
  'cofre-do-tempo': cofre,
  'mercado-esperto': mercado,
  'ordene-a-prioridade': ordene,
};

function escolher(slugDoTipoDeJogo) {
  const validador = VALIDADORES[slugDoTipoDeJogo];
  if (!validador) {
    throw erroValidacao(`Este jogo ainda não pode ser jogado: falta o validador de "${slugDoTipoDeJogo}"`);
  }
  return validador;
}

const LIMITE_DE_RESPOSTAS_PARCIAIS = 100;

export function estadoParaSalvar(slugDoTipoDeJogo, respostasParciais) {
  const validador = escolher(slugDoTipoDeJogo);
  if (validador.estadoParaSalvar) return validador.estadoParaSalvar(respostasParciais);

  if (!Array.isArray(respostasParciais)) {
    throw erroValidacao('O progresso precisa vir em lista, na ordem em que foi decidido');
  }
  return { respostas: respostasParciais.slice(0, LIMITE_DE_RESPOSTAS_PARCIAIS) };
}

export function tiposJogaveis() {
  return Object.keys(VALIDADORES);
}

export function conferirForma(slugDoTipoDeJogo, corpo) {
  escolher(slugDoTipoDeJogo).conferirForma(corpo);
}

export function validarRespostas(slugDoTipoDeJogo, corpo, respostas) {
  const validador = escolher(slugDoTipoDeJogo);
  validador.conferirForma(corpo);
  return validador.validar(corpo, respostas);
}

export function conteudoParaJogar(slugDoTipoDeJogo, corpo) {
  const validador = escolher(slugDoTipoDeJogo);
  validador.conferirForma(corpo);
  return validador.paraJogar(corpo);
}
