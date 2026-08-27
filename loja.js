const SUPABASE_URL = "https://ksognpzaasjevupohfdv.supabase.co";
const SUPABASE_KEY = "sb_publishable_8rt9qB9SbfcAi0rfjhYv9A_7k5pQ6PO";
const NUMERO_WHATSAPP = "5515996787168"; // troque pelo seu número (só números, com código do país)

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

  const porCategoria = {};
  produtos.forEach(p => {
    if (!porCategoria[p.categoria]) porCategoria[p.categoria] = [];
    porCategoria[p.categoria].push(p);
  });

  let html = "";
  Object.keys(porCategoria).forEach(cat => {
    html += `<h2 class="categoria-titulo">${nomesCategorias[cat] || cat}</h2>`;
    html += `<div class="grade-produtos">`;
    porCategoria[cat].forEach(p => {
      html += `
        <div class="produto-card">
          <img src="${p.foto_url || ''}" alt="${p.nome}">
          <div class="produto-info">
            <b>${p.nome}</b>
            <p style="font-size:0.85rem; color:#666; min-height:36px;">${p.descricao || ''}</p>
            <p style="font-weight:bold; color:#d46a8f;">R$ ${Number(p.preco).toFixed(2)}</p>
            <a href="${linkWhatsApp(p.nome)}" target="_blank" class="btn-primary" style="display:block; text-align:center; text-decoration:none;">Comprar pelo WhatsApp</a>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  });

  container.innerHTML = html;
}

carregarLoja();
