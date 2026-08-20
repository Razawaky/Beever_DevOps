import { renderizarPagina } from '../utils/pagina.js';

export function mostrar(req, res) {
  if (req.session?.usuarioId) {
    return res.redirect(req.session.onboardingConcluido ? '/painel' : '/onboarding');
  }

  renderizarPagina(res, 'home', {
    titulo: 'Beever — educação financeira para crianças e adolescentes',
    comCabecalho: true,
    comRodape: true,
  });
}
