import { classeDaBarra } from './barraDeProgresso.js';

export function renderizarPagina(res, pagina, dados = {}) {
  const {
    classeBody = 'min-h-screen bg-white text-tinta antialiased',
    comCabecalho = false,
    comRodape = false,
    dadosBody = {},
    scripts = [],
    ...conteudo
  } = dados;

  return res.render('layout', {
    pagina: `pages/${pagina}`,
    classeDaBarra,
    classeBody,
    comCabecalho,
    comRodape,
    dadosBody,
    scripts,
    ...conteudo,
  });
}
