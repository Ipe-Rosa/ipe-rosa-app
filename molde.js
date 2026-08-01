const SUPABASE_URL = "https://ksognpzaasjevupohfdv.supabase.co";
const SUPABASE_KEY = "COLE_AQUI_SUA_PUBLISHABLE_KEY";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const nomesTipoPeca = {
  camiseta_basica: "Camiseta básica",
  saia_reta: "Saia reta",
  calca_reta: "Calça reta"
};

let pedidoGlobal = null;
let resultadoGlobal = null; // sempre no formato { pecas: [ {nome, path, largura, altura}, ... ] }

// ===== Monta um painel (frente OU costas) com pence calculada =====
function construirPainel(larguraQuadril, larguraCintura, altura, proporcaoPence) {
  let diferenca = larguraQuadril - larguraCintura;
  if (diferenca < 0) diferenca = 0;

  const alturaQuadril = Math.min(20, altura * 0.4);
  const profundidadeBase = Math.max(0, Math.min(10, altura * 0.3, alturaQuadril * 0.9));
  const profundidadePence = profundidadeBase * proporcaoPence;

  const centroX = larguraQuadril * 0.6;
  const penceEsq = centroX - diferenca / 2;
  const penceDir = centroX + diferenca / 2;
  const temPence = diferenca > 0.3;

  const path = temPence
    ? `M 0 0 L ${penceEsq.toFixed(2)} 0 L ${centroX.toFixed(2)} ${profundidadePence.toFixed(2)} L ${penceDir.toFixed(2)} 0 L ${larguraQuadril.toFixed(2)} 0 L ${larguraQuadril.toFixed(2)} ${altura.toFixed(2)} L 0 ${altura.toFixed(2)} Z`
    : `M 0 0 L ${larguraQuadril.toFixed(2)} 0 L ${larguraQuadril.toFixed(2)} ${altura.toFixed(2)} L 0 ${altura.toFixed(2)} Z`;

  return { path, largura: larguraQuadril, altura, temPence };
}

// ===== Saia reta: agora com frente e costas separadas =====
function gerarMoldeSaiaReta(medidas) {
  const cintura = medidas.cintura_saia;
  const quadril = medidas.quadril_saia;
  const comprimento = medidas.comprimento_saia;

  const folgaQuadril = 2;
  const folgaCintura = 1;

  const larguraQuadrilQuarto = quadril / 4 + folgaQuadril / 4;
  const larguraCinturaQuarto = cintura / 4 + folgaCintura / 4;

  // A frente tem menos "pence" que as costas — é assim na modelagem real,
  // porque o corpo curva mais nas costas do que na frente.
  const diferencaTotal = Math.max(0, larguraQuadrilQuarto - larguraCinturaQuarto);
  const larguraCinturaFrente = larguraQuadrilQuarto - diferencaTotal * 0.4;
  const larguraCinturaCostas = larguraQuadrilQuarto - diferencaTotal * 0.6;

  const frente = construirPainel(larguraQuadrilQuarto, larguraCinturaFrente, comprimento, 0.8);
  const costas = construirPainel(larguraQuadrilQuarto, larguraCinturaCostas, comprimento, 1.2);

  return {
    pecas: [
      { nome: "Frente (corte na dobra) 2x", ...frente, dobra: true },
      { nome: "Costas (com costura central) 2x", ...costas, dobra: false }
    ]
  };
}

// ===== Método antigo (placeholder + escala linear) - ainda usado por camiseta e calça =====
async function gerarMoldeAntigo(pedido) {
  const { data: moldesBase, error } = await supabaseClient
    .from("moldes_base")
    .select("*")
    .eq("tipo_peca", pedido.tipo_peca)
    .limit(1);

  if (error || !moldesBase || moldesBase.length === 0) return null;

  const moldeBase = moldesBase[0];
  const medidasPadrao = moldeBase.medidas_padrao;
  const escalaX = pedido.medidas[moldeBase.eixo_x] / medidasPadrao[moldeBase.eixo_x];
  const escalaY = pedido.medidas[moldeBase.eixo_y] / medidasPadrao[moldeBase.eixo_y];

  return {
    pecas: [{
      nome: nomesTipoPeca[pedido.tipo_peca] || pedido.tipo_peca,
      path: moldeBase.path_svg,
      largura: pedido.medidas[moldeBase.eixo_x],
      altura: pedido.medidas[moldeBase.eixo_y],
      transformEscala: `scale(${escalaX}, ${escalaY})`,
      dobra: false
    }]
  };
}

function renderizarPeca(peca) {
  const alturaDisplay = Math.round(220 * (peca.altura / peca.largura));
  const transform = peca.transformEscala ? `transform="${peca.transformEscala}"` : "";
  const linhaDobra = peca.dobra
    ? `<line x1="0" y1="0" x2="0" y2="${peca.altura.toFixed(2)}" stroke="#999" stroke-width="0.15" stroke-dasharray="1,1"/>
       <text x="0.8" y="${(peca.altura / 2).toFixed(2)}" font-size="3" fill="#999">dobra</text>`
    : "";

  return `
    <div style="display:inline-block; margin:8px; text-align:center;">
      <p style="font-size:0.85rem; font-weight:bold; margin-bottom:4px;">${peca.nome}</p>
      <svg viewBox="0 0 ${peca.largura.toFixed(2)} ${peca.altura.toFixed(2)}" width="220" height="${alturaDisplay}" xmlns="http://www.w3.org/2000/svg" style="background:white; border-radius:8px; border:1px solid #eee;">
        <g ${transform}>
          <path d="${peca.path}" fill="none" stroke="#d46a8f" stroke-width="0.3"/>
        </g>
        ${linhaDobra}
      </svg>
    </div>
  `;
}

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
  pedidoGlobal = pedido;

  let resultado;
  if (pedido.tipo_peca === "saia_reta") {
    resultado = gerarMoldeSaiaReta(pedido.medidas);
  } else {
    resultado = await gerarMoldeAntigo(pedido);
  }

  if (!resultado) {
    document.getElementById("sem-molde").style.display = "block";
    return;
  }

  resultadoGlobal = resultado;

  document.getElementById("molde-titulo").textContent =
    "Peça: " + (nomesTipoPeca[pedido.tipo_peca] || pedido.tipo_peca);

  document.getElementById("molde-svg-container").innerHTML =
    resultado.pecas.map(renderizarPeca).join("");

  const avisoExtra = document.getElementById("molde-aviso-extra");
  if (pedido.tipo_peca === "saia_reta") {
    avisoExtra.textContent = "✅ Frente e costas calculadas separadamente, com pences diferentes (costas com mais profundidade, como na modelagem real).";
    avisoExtra.style.display = "block";
  } else {
    avisoExtra.style.display = "none";
  }

  document.getElementById("resultado-molde").style.display = "block";

  await supabaseClient
    .from("pedidos_de_molde")
    .update({ status: "molde_gerado" })
    .eq("id", pedido.id);
}

// ===== PDF: agora percorre todas as peças, 1 por página =====
async function gerarPDF() {
  const mensagem = document.getElementById("pdf-mensagem");
  mensagem.textContent = "Gerando PDF...";
  mensagem.className = "mensagem";

  try {
    const { jsPDF } = window.jspdf;
    const nomePecaGeral = nomesTipoPeca[pedidoGlobal.tipo_peca] || pedidoGlobal.tipo_peca;
    const doc = new jsPDF({ unit: "cm", format: "a4" });

    const margemCm = 1.5;
    const areaMaxLargura = 21 - margemCm * 2;
    const areaMaxAltura = 16;

    const todosSvgs = document.querySelectorAll("#molde-svg-container svg");

    for (let i = 0; i < resultadoGlobal.pecas.length; i++) {
      const peca = resultadoGlobal.pecas[i];
      if (i > 0) doc.addPage();

      const fatorReducao = Math.min(areaMaxLargura / peca.largura, areaMaxAltura / peca.altura, 1);
      const larguraDesenho = peca.largura * fatorReducao;
      const alturaDesenho = peca.altura * fatorReducao;

      doc.setFontSize(14);
      doc.text("IPÊ ROSA - " + nomePecaGeral, margemCm, margemCm);
      doc.setFontSize(11);
      doc.text(peca.nome, margemCm, margemCm + 0.6);
      doc.setTextColor(200, 80, 80);
      doc.setFontSize(9);
      doc.text(
        `Reduzido em ${Math.round(fatorReducao * 100)}% para caber na pagina - NAO esta em tamanho real.`,
        margemCm, margemCm + 1.2
      );
      doc.setTextColor(0, 0, 0);

      const yDesenho = margemCm + 1.8;
      await doc.svg(todosSvgs[i], { x: margemCm, y: yDesenho, width: larguraDesenho, height: alturaDesenho });

      const yCalibracao = yDesenho + alturaDesenho + 1.5;
      doc.setDrawColor(212, 106, 143);
      doc.setLineWidth(0.03);
      doc.rect(margemCm, yCalibracao, 5, 5);
      doc.setFontSize(8);
      doc.text("Quadrado de calibracao: deve medir exatamente 5 x 5 cm", margemCm + 5.5, yCalibracao + 1.2);
      doc.text("apos impresso. Sempre imprima em \"Tamanho real / 100%\".", margemCm + 5.5, yCalibracao + 1.8);
    }

    doc.save(`molde-${pedidoGlobal.tipo_peca}-referencia.pdf`);
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
