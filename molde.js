const SUPABASE_URL = "https://ksognpzaasjevupohfdv.supabase.co";
const SUPABASE_KEY = "sb_publishable_8rt9qB9SbfcAi0rfjhYv9A_7k5pQ6PO";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const nomesTipoPeca = {
  camiseta_basica: "Camiseta básica",
  saia_reta: "Saia reta",
  calca_reta: "Calça reta"
};

// Guardamos os dados do molde carregado para o botão de PDF usar depois
let pedidoGlobal = null;
let moldeBaseGlobal = null;
let escalaXGlobal = 1;
let escalaYGlobal = 1;

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

  pedidoGlobal = pedido;
  moldeBaseGlobal = moldeBase;
  escalaXGlobal = escalaX;
  escalaYGlobal = escalaY;

  document.getElementById("molde-titulo").textContent =
    "Peça: " + (nomesTipoPeca[pedido.tipo_peca] || pedido.tipo_peca);

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

// ===== GERAÇÃO DO PDF EM TAMANHO REAL =====
async function gerarPDF() {
  const mensagem = document.getElementById("pdf-mensagem");
  mensagem.textContent = "Gerando PDF...";
  mensagem.className = "mensagem";

  try {
    const { jsPDF } = window.jspdf;

    const nomePeca = nomesTipoPeca[pedidoGlobal.tipo_peca] || pedidoGlobal.tipo_peca;
    const larguraCm = pedidoGlobal.medidas[moldeBaseGlobal.eixo_x];
    const alturaCm = pedidoGlobal.medidas[moldeBaseGlobal.eixo_y];
    const margemCm = 2;
    const espacoTitulo = 2;
    const espacoRodape = 2.5;

    const larguraPagina = larguraCm + margemCm * 2;
    const alturaPagina = alturaCm + margemCm * 2 + espacoTitulo + espacoRodape;

    const doc = new jsPDF({
      unit: "cm",
      format: [larguraPagina, alturaPagina]
    });

    doc.setFontSize(14);
    doc.text("IPÊ ROSA - " + nomePeca, margemCm, margemCm);
    doc.setFontSize(9);
    doc.text("Medidas: " + JSON.stringify(pedidoGlobal.medidas), margemCm, margemCm + 0.6);

    const svgElement = document.querySelector("#molde-svg-container svg");
    await doc.svg(svgElement, {
      x: margemCm,
      y: margemCm + espacoTitulo,
      width: larguraCm,
      height: alturaCm
    });

    doc.setFontSize(9);
    const textoAviso = doc.splitTextToSize(
      "Versão simplificada para validação do sistema. Ainda não substitui um molde profissional — sempre faça um teste em tecido barato (toile) antes de cortar o tecido final. Imprima sem ajuste de escala (100%).",
      larguraCm
    );
    doc.text(textoAviso, margemCm, margemCm + espacoTitulo + alturaCm + 0.8);

    doc.save(`molde-${pedidoGlobal.tipo_peca}.pdf`);

    mensagem.textContent = "PDF gerado! Confira sua pasta de downloads.";
    mensagem.className = "mensagem sucesso";
  } catch (erro) {
    mensagem.textContent = "Erro ao gerar PDF: " + erro.message;
    mensagem.className = "mensagem erro";
    console.error(erro);
  }
}

document.getElementById("btn-baixar-pdf").addEventListener("click", gerarPDF);

carregarMolde();
