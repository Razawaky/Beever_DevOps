export function iniciarSessaoLogin(req, { usuarioId, email, ehAdmin, perfilId, onboardingConcluido }) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((erro) => {
      if (erro) return reject(erro);
      req.session.usuarioId = usuarioId;
      req.session.email = email;
      req.session.ehAdmin = ehAdmin;
      req.session.perfilId = perfilId;
      req.session.onboardingConcluido = onboardingConcluido;
      resolve();
    });
  });
}
