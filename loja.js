const SUPABASE_URL = "https://ksognpzaasjevupohfdv.supabase.co";
const SUPABASE_KEY = "sb_publishable_8rt9qB9SbfcAi0rfjhYv9A_7k5pQ6PO";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const nomesCategorias = {
  bolsas: "Bolsas de pano",
  necessaire: "Necessaire",
  lancheira: "Lancheira térmica",
  carteiras: "Carteiras de pano",
  saias: "Saias retas",
  camisas: "Camisa social feminina",
  // categorias antigas: mantidas só pra continuar exibindo produtos já cadastrados com elas
  roupas: "Roupas femininas",
  almofada: "Almofada",
  acessorios: "Acessórios femininos",
  pet: "Brinquedos de pano pet"
};

let produtosGlobal = [];
let filtroAtual = { categoria: "", cor: "" };
let produtoSelecionadoId = null;

async function carregarLoja() {
  const { data: produtos, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .eq("disponivel", true)
    .order("categoria", { ascending: true });

  const container = document.getElementById("loja-conteudo");

  if (error || !produtos || produtos.length === 0) {
    container.innerHTML = "<p>Ainda não temos produtos publicados. Volte em breve!</p>";
    return;
  }

  produtosGlobal = produtos;
  montarFiltros(produtos);
  renderizarProdutos();
}

function montarFiltros(produtos) {
  const categorias = [...new Set(produtos.map(p => p.categoria).filter(Boolean))];
  const cores = [...new Set(produtos.map(p => p.cor).filter(Boolean))];

  if (categorias.length <= 1 && cores.length === 0) return;

  document.getElementById("filtro-loja").style.display = "flex";

  const selCategoria = document.getElementById("filtro-categoria");
  categorias.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = nomesCategorias[cat] || cat;
    selCategoria.appendChild(opt);
  });

  const selCor = document.getElementById("filtro-cor");
  cores.forEach(cor => {
    const opt = document.createElement("option");
    opt.value = cor;
    opt.textContent = cor;
    selCor.appendChild(opt);
  });

  selCategoria.addEventListener("change", () => {
    filtroAtual.categoria = selCategoria.value;
    renderizarProdutos();
  });
  selCor.addEventListener("change", () => {
    filtroAtual.cor = selCor.value;
    renderizarProdutos();
  });
  document.getElementById("btn-limpar-filtros").addEventListener("click", () => {
    filtroAtual = { categoria: "", cor: "" };
    selCategoria.value = "";
    selCor.value = "";
    renderizarProdutos();
  });
}

function renderizarProdutos() {
  const container = document.getElementById("loja-conteudo");
  const filtrados = produtosGlobal.filter(p =>
    (!filtroAtual.categoria || p.categoria === filtroAtual.categoria) &&
    (!filtroAtual.cor || p.cor === filtroAtual.cor)
  );

  if (filtrados.length === 0) {
    container.innerHTML = `<p class="sem-resultados">Nenhum produto encontrado com esse filtro.</p>`;
    return;
  }

  const porCategoria = {};
  filtrados.forEach(p => {
    if (!porCategoria[p.categoria]) porCategoria[p.categoria] = [];
    porCategoria[p.categoria].push(p);
  });

  let html = "";
  Object.keys(porCategoria).forEach(cat => {
    html += `<h2 class="categoria-titulo">${nomesCategorias[cat] || cat}</h2>`;
    html += `<div class="grade-produtos">`;
    porCategoria[cat].forEach(p => {
      const nomeAtributo = String(p.nome || "").replace(/"/g, "&quot;");
      html += `
        <div class="produto-card">
          <img src="${p.foto_url || ''}" alt="${p.nome}">
          <div class="produto-info">
            <b>${p.nome}</b>
            <div class="tags">
              <span class="tag-chip">${nomesCategorias[cat] || cat}</span>
              ${p.cor ? `<span class="tag-chip">${p.cor}</span>` : ''}
            </div>
            <p style="font-size:0.85rem; color:#666; min-height:36px; flex:1;">${p.descricao || ''}</p>
            <p style="font-weight:bold; color:#d46a8f; font-size:1.05rem;">R$ ${Number(p.preco).toFixed(2)}</p>
            <button type="button" class="btn-interesse" data-produto-id="${p.id}" data-produto-nome="${nomeAtributo}">Tenho interesse</button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  });

  container.innerHTML = html;

  container.querySelectorAll(".btn-interesse").forEach(btn => {
    btn.addEventListener("click", () => abrirModal(btn.dataset.produtoId, btn.dataset.produtoNome));
  });
}

function abrirModal(produtoId, produtoNome) {
  produtoSelecionadoId = produtoId;
  document.getElementById("modal-produto-nome").textContent = produtoNome;
  document.getElementById("form-interesse").reset();
  const status = document.getElementById("interesse-mensagem-status");
  status.textContent = "";
  status.className = "mensagem";
  document.getElementById("modal-fundo").classList.add("aberto");
}

function fecharModal() {
  document.getElementById("modal-fundo").classList.remove("aberto");
}

document.getElementById("modal-fechar").addEventListener("click", fecharModal);
document.getElementById("modal-fundo").addEventListener("click", (e) => {
  if (e.target.id === "modal-fundo") fecharModal();
});

document.getElementById("form-interesse").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("interesse-mensagem-status");
  status.textContent = "Enviando...";
  status.className = "mensagem";

  const { error } = await supabaseClient.from("interesses_produtos").insert({
    produto_id: produtoSelecionadoId,
    nome: document.getElementById("interesse-nome").value,
    contato: document.getElementById("interesse-contato").value,
    mensagem: document.getElementById("interesse-mensagem").value
  });

  if (error) {
    status.textContent = "Não deu pra enviar agora. Tenta de novo em instantes.";
    status.className = "mensagem erro";
    return;
  }

  status.textContent = "Recebemos seu interesse! Em breve entramos em contato. 🌸";
  status.className = "mensagem sucesso";
  setTimeout(fecharModal, 1800);
});

carregarLoja();
