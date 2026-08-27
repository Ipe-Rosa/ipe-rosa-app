const SUPABASE_URL = "https://ksognpzaasjevupohfdv.supabase.co";
const SUPABASE_KEY = "sb_publishable_8rt9qB9SbfcAi0rfjhYv9A_7k5pQ6PO";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const nomesCategorias = {
  bolsas: "Bolsas de pano",
  roupas: "Roupas femininas",
  necessaire: "Necessaire",
  almofada: "Almofada",
  acessorios: "Acessórios femininos",
  pet: "Brinquedos de pano pet"
};

let usuarioAtual = null;

async function verificarLogin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "conta.html";
    return;
  }
  usuarioAtual = session.user;
  carregarProdutos();
}

document.getElementById("foto").addEventListener("change", (e) => {
  const arquivo = e.target.files[0];
  const preview = document.getElementById("preview");
  if (arquivo) {
    preview.src = URL.createObjectURL(arquivo);
    preview.style.display = "block";
  }
});

document.getElementById("form-produto").addEventListener("submit", async (e) => {
  e.preventDefault();
  const mensagem = document.getElementById("produto-mensagem");
  const arquivo = document.getElementById("foto").files[0];

  mensagem.textContent = "Salvando...";
  mensagem.className = "mensagem";

  let fotoUrl = null;
  if (arquivo) {
    const nomeLimpo = arquivo.name
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const nomeArquivo = `${Date.now()}_${nomeLimpo}`;
    const { error: erroUpload } = await supabaseClient.storage.from("produtos-fotos").upload(nomeArquivo, arquivo);
    if (erroUpload) {
      mensagem.textContent = "Erro ao enviar a foto: " + erroUpload.message;
      mensagem.className = "mensagem erro";
      return;
    }
    const { data: urlData } = supabaseClient.storage.from("produtos-fotos").getPublicUrl(nomeArquivo);
    fotoUrl = urlData.publicUrl;
  }

  const { error } = await supabaseClient.from("produtos").insert({
    nome: document.getElementById("nome").value,
    categoria: document.getElementById("categoria").value,
    descricao: document.getElementById("descricao").value,
    preco: parseFloat(document.getElementById("preco").value),
    foto_url: fotoUrl,
    disponivel: document.getElementById("disponivel").checked
  });

  if (error) {
    mensagem.textContent = "Erro ao salvar: " + error.message;
    mensagem.className = "mensagem erro";
    return;
  }

  mensagem.textContent = "Produto salvo com sucesso!";
  mensagem.className = "mensagem sucesso";
  document.getElementById("form-produto").reset();
  document.getElementById("preview").style.display = "none";
  carregarProdutos();
});

async function carregarProdutos() {
  const { data: produtos, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .order("criado_em", { ascending: false });

  const lista = document.getElementById("lista-produtos");
  if (error || !produtos || produtos.length === 0) {
    lista.innerHTML = "<p>Nenhum produto cadastrado ainda.</p>";
    return;
  }

  lista.innerHTML = produtos.map(p => `
    <div style="display:flex; gap:12px; align-items:center; border-bottom:1px solid #eee; padding:10px 0;">
      <img src="${p.foto_url || ''}" style="width:60px; height:60px; object-fit:cover; border-radius:6px; background:#f5e6ec;">
      <div style="flex:1;">
        <b>${p.nome}</b> — R$ ${Number(p.preco).toFixed(2)}<br>
        <span style="font-size:0.8rem; color:#999;">${nomesCategorias[p.categoria] || p.categoria} ${p.disponivel ? '' : '(oculto)'}</span>
      </div>
      <button onclick="excluirProduto(${p.id})" class="btn-primary" style="width:auto; padding:6px 12px; background:#c0392b;">Excluir</button>
    </div>
  `).join("");
}

async function excluirProduto(id) {
  if (!confirm("Tem certeza que quer excluir esse produto?")) return;
  await supabaseClient.from("produtos").delete().eq("id", id);
  carregarProdutos();
}
window.excluirProduto = excluirProduto;

verificarLogin();
