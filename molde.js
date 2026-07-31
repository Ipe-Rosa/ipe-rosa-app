const SUPABASE_URL = "https://ksognpzaasjevupohfdv.supabase.co";
const SUPABASE_KEY = "sb_publishable_8rt9qB9SbfcAi0rfjhYv9A_7k5pQ6PO";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const nomesTipoPeca = {
  camiseta_basica: "Camiseta básica",
  saia_reta: "Saia reta",
  calca_reta: "Calça reta"
};

async function carregarMolde() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "conta.html";
    return;
  }

  const { data: pedidos, error: erroPedido } = await supabaseClient
    .from("pedidos_de_molde")
    .select("*")
    .eq("usuario_id", session.user.id)
    .eq("status", "medidas_informadas")
    .order("data_criacao", { ascending: false })
    .limit(1);

  document.getElementById("carregando").style.display = "none";

  if (erroPedido || !pedidos || pedidos.length === 0) {
    document.getElementById("sem-molde").style.display = "block";
    return;
  }

  const pedido = pedidos[0];

  const { data: moldesBase, error: erroMolde } = await supabaseClient
    .from("moldes_base")
    .select("*")
    .eq("tipo_peca", pedido.tipo_peca)
    .limit(1);

  if (erroMolde || !moldesBase || moldesBase.length === 0) {
    document.getElementById("sem-molde").style.display = "block";
    return;
  }

  const moldeBase = moldesBase[0];
  const medidasUsuario = pedido.medidas;
  const medidasPadrao = moldeBase.medidas_padrao;

  const escalaX = medidasUsuario[moldeBase.eixo_x] / medidasPadrao[moldeBase.eixo_x];
  const escalaY = medidasUsuario[moldeBase.eixo_y] / medidasPadrao[moldeBase.eixo_y];

  document.getElementById("molde-titulo").textContent =
    "Peça: " + (nomesTipoPeca[pedido.tipo_peca] || pedido.tipo_peca);

// Faz o "quadro" do desenho crescer junto com a escala, para nada ficar cortado
  const [vbX, vbY, vbLargura, vbAltura] = moldeBase.viewbox.split(" ").map(Number);
  const novoViewBox = `${vbX} ${vbY} ${vbLargura * escalaX} ${vbAltura * escalaY}`;

  document.getElementById("molde-svg-container").innerHTML = `
    <svg viewBox="${novoViewBox}" width="300" height="375" xmlns="http://www.w3.org/2000/svg" style="background:white; border-radius:8px;">
      <g transform="scale(${escalaX}, ${escalaY})">
        <path d="${moldeBase.path_svg}" fill="none" stroke="#d46a8f" stroke-width="2" vector-effect="non-scaling-stroke"/>
      </g>
    </svg>
  `;

  document.getElementById("resultado-molde").style.display = "block";

  await supabaseClient
    .from("pedidos_de_molde")
    .update({ status: "molde_gerado" })
    .eq("id", pedido.id);
}

carregarMolde();
