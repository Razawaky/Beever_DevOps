document.getElementById('form-cadastro')?.addEventListener('submit', (evento) => {
  const senha = document.getElementById('senha');
  const confirmarSenha = document.getElementById('confirmarSenha');

  if (senha.value !== confirmarSenha.value) {
    evento.preventDefault();
    confirmarSenha.setCustomValidity('As senhas não coincidem');
    confirmarSenha.reportValidity();
    return;
  }

  confirmarSenha.setCustomValidity('');
});
