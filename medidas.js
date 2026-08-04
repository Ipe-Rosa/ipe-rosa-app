const SUPABASE_URL = "https://ksognpzaasjevupohfdv.supabase.co";
const SUPABASE_KEY = "sb_publishable_8rt9qB9SbfcAi0rfjhYv9A_7k5pQ6PO";

const mapaCamposPorTipo = {
  saia_reta: { cintura: "cintura_saia", quadril: "quadril_saia" }
};

async function carregarTamanhosPadrao(tipoPeca) {
  const mapa = mapaCamposPorTipo[tipoPeca];
  if (!mapa) return;

  const { data: tamanhos, error } = await supabaseClient
    .from("tabela_medidas_padrao")
    .select("*")
    .order("numeracao", { ascending: true });

  if (error || !tamanhos) return;

  const select = document.getElementById("tamanho-padrao");
  tamanhos.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.numeracao;
    opt.textContent = `Tamanho ${t.numeracao} (cintura ${t.cintura}cm, quadril ${t.quadril}cm)`;
    opt.dataset.cintura = t.cintura;
    opt.dataset.quadril = t.quadril;
    select.appendChild(opt);
  });

  document.getElementById("seletor-tamanho-padrao").style.display = "block";

  select.addEventListener("change", () => {
    const opcao = select.options[select.selectedIndex];
    if (!opcao.value) return;

    const campoCintura = document.getElementById(mapa.cintura);
    const campoQuadril = document.getElementById(mapa.quadril);
    if (campoCintura) campoCintura.value = opcao.dataset.cintura;
    if (campoQuadril) campoQuadril.value = opcao.dataset.quadril;
  });
}

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const nomesTipoPeca = {
  camiseta_basica: "Camiseta básica",
  saia_reta: "Saia reta",
  calca_reta: "Calça reta"
};

let pedidoAtual = null;

async function carregarPedidoPendente() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "conta.html";
    return;
  }

  const { data, error } = await supabaseClient
    .from("pedidos_de_molde")
    .select("*")
    .eq("usuario_id", session.user.id)
    .eq("status", "aguardando_medidas")
    .order("data_criacao", { ascending: false })
    .limit(1);

  document.getElementById("carregando").style.display = "none";

  if (error || !data || data.length === 0) {
    document.getElementById("sem-pedido").style.display = "block";
    return;
  }

  pedidoAtual = data[0];
  mostrarCamposDoTipo(pedidoAtual.tipo_peca);
}

function mostrarCamposDoTipo(tipoPeca) {
  document.getElementById("tipo-peca-titulo").textContent =
    "Peça: " + (nomesTipoPeca[tipoPeca] || tipoPeca);

  document.querySelectorAll(".grupo-medida").forEach((grupo) => {
    grupo.style.display = grupo.dataset.tipo === tipoPeca ? "block" : "none";
  });

  document.getElementById("form-medidas").style.display = "block";
  carregarTamanhosPadrao(tipoPeca);
}

document.getElementById("form-medidas").addEventListener("submit", async (e) => {
  e.preventDefault();
  const mensagem = document.getElementById("medidas-mensagem");

  const grupoVisivel = document.querySelector(
    `.grupo-medida[data-tipo="${pedidoAtual.tipo_peca}"]`
  );
  const campos = grupoVisivel.querySelectorAll("input");

  const medidas = {};
  for (const campo of campos) {
    if (!campo.value) {
      mensagem.textContent = "Preencha todas as medidas antes de salvar.";
      mensagem.className = "mensagem erro";
      return;
    }
    medidas[campo.id] = parseFloat(campo.value);
  }

  mensagem.textContent = "Salvando...";
  mensagem.className = "mensagem";

  const { error } = await supabaseClient
    .from("pedidos_de_molde")
    .update({ medidas: medidas, status: "medidas_informadas" })
    .eq("id", pedidoAtual.id);

  if (error) {
    mensagem.textContent = "Erro ao salvar: " + error.message;
    mensagem.className = "mensagem erro";
    return;
  }

mensagem.textContent = "Medidas salvas! Gerando seu molde...";
  mensagem.className = "mensagem sucesso";

  setTimeout(() => {
    window.location.href = "molde.html";
  }, 1500);
});

carregarPedidoPendente();
