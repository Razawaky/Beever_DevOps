const formulario = document.getElementById('form-disponibilidade');
const aviso = document.getElementById('aviso-disponibilidade');
const botao = document.getElementById('btn-salvar-dias');
const perfilId = formulario?.dataset.perfilId;
const csrfToken = document.body.dataset.csrfToken;

function mostrar(mensagem, erro = false) {
  aviso.textContent = mensagem;
  aviso.classList.remove('hidden');
  aviso.classList.toggle('text-perigo', erro);
}

function resumir(resultado) {
  const partes = [`Agora você joga ${resultado.dias.length} dia(s) por semana.`];

  if (resultado.metasGeradas > 0) {
    partes.push(`${resultado.metasGeradas} meta(s) nova(s) entraram no seu plano.`);
  }
  if (resultado.metasExcedentes > 0) {
    partes.push(
      `Você tem ${resultado.metasExcedentes} meta(s) além do que este ritmo pede: elas continuam valendo até o prazo acabar, e o que você já fez nelas não se perde.`,
    );
  }
  if (resultado.metasGeradas === 0 && resultado.metasExcedentes === 0) {
    partes.push('Seu plano de metas continua o mesmo.');
  }

  return partes.join(' ');
}

formulario?.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const dias = [...formulario.querySelectorAll('input[name="dias"]:checked')].map((campo) => campo.value);
  if (dias.length === 0) {
    mostrar('Escolha pelo menos um dia da semana para jogar.', true);
    return;
  }

  botao.disabled = true;
  botao.textContent = 'Salvando...';

  try {
    const resposta = await fetch(`/perfil/${perfilId}/disponibilidade`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-csrf-token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({ dias }),
    });

    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(corpo.erro || 'Não foi possível salvar seus dias.');

    mostrar(resumir(corpo));
  } catch (erro) {
    mostrar(erro.message, true);
  } finally {
    botao.disabled = false;
    botao.textContent = 'Salvar meus dias';
  }
});
