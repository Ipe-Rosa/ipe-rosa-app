const SUPABASE_URL = "https://ksognpzaasjevupohfdv.supabase.co";
const SUPABASE_KEY = "sb_publishable_8rt9qB9SbfcAi0rfjhYv9A_7k5pQ6PO";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioAtual = null;

async function verificarLogin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "conta.html";
    return;
  }
  usuarioAtual = session.user;
}

document.getElementById("foto").addEventListener("change", (e) => {
  const arquivo = e.target.files[0];
  const preview = document.getElementById("preview");
  if (arquivo) {
    preview.src = URL.createObjectURL(arquivo);
    preview.style.display = "block";
  }
});

document.getElementById("form-upload").addEventListener("submit", async (e) => {
  e.preventDefault();

  const arquivo = document.getElementById("foto").files[0];
  const tipoPeca = document.getElementById("tipo-peca").value;
  const mensagem = document.getElementById("upload-mensagem");

  if (!arquivo || !tipoPeca) {
    mensagem.textContent = "Escolha uma foto e o tipo de peça.";
    mensagem.className = "mensagem erro";
    return;
  }

  mensagem.textContent = "Enviando foto...";
  mensagem.className = "mensagem";

  const nomeArquivo = `${usuarioAtual.id}/${Date.now()}_${arquivo.name}`;

  const { error: erroUpload } = await supabaseClient
    .storage
    .from("fotos-roupas")
    .upload(nomeArquivo, arquivo);

  if (erroUpload) {
    mensagem.textContent = "Erro ao enviar a foto: " + erroUpload.message;
    mensagem.className = "mensagem erro";
    return;
  }

  const { data: urlData } = supabaseClient
    .storage
    .from("fotos-roupas")
    .getPublicUrl(nomeArquivo);

  const fotoUrl = urlData.publicUrl;

  const { error: erroInsercao } = await supabaseClient
    .from("pedidos_de_molde")
    .insert({
      usuario_id: usuarioAtual.id,
      foto_url: fotoUrl,
      tipo_peca: tipoPeca
    });

  if (erroInsercao) {
    mensagem.textContent = "Erro ao salvar o pedido: " + erroInsercao.message;
    mensagem.className = "mensagem erro";
    return;
  }

  mensagem.textContent = "Foto enviada com sucesso! Redirecionando para informar suas medidas...";
  mensagem.className = "mensagem sucesso";

  setTimeout(() => {
    window.location.href = "medidas.html";
  }, 1500);
});

verificarLogin();
