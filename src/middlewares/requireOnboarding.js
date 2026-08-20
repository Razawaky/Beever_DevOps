import { ErroAplicacao, erroNaoAutorizado } from '../utils/erros.js';
import { querJson } from '../utils/resposta.js';

export function requireOnboarding(req, res, next) {
  if (!req.session?.usuarioId) {
    return querJson(req) ? next(erroNaoAutorizado()) : res.redirect('/login');
  }

  if (req.session.onboardingConcluido) return next();

  if (querJson(req)) {
    return next(
      new ErroAplicacao('Conclua a configuração do perfil antes de continuar', {
        status: 403,
        codigo: 'ONBOARDING_PENDENTE',
      }),
    );
  }

  res.redirect('/onboarding');
}

export function requireOnboardingPendente(req, res, next) {
  if (!req.session?.usuarioId) {
    return querJson(req) ? next(erroNaoAutorizado()) : res.redirect('/login');
  }

  if (!req.session.onboardingConcluido) return next();

  if (querJson(req)) {
    return next(
      new ErroAplicacao('Este perfil já concluiu a configuração', {
        status: 409,
        codigo: 'ONBOARDING_JA_CONCLUIDO',
      }),
    );
  }

  res.redirect('/painel');
}
