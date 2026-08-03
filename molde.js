const SUPABASE_URL = "https://ksognpzaasjevupohfdv.supabase.co";
const SUPABASE_KEY = "sb_publishable_8rt9qB9SbfcAi0rfjhYv9A_7k5pQ6PO";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const nomesTipoPeca = {
  camiseta_basica: "Camiseta básica",
  saia_reta: "Saia reta",
  calca_reta: "Calça reta"
};

// ===== Margens reais (engenharia do molde), em cm =====
const MARGEM_LATERAL = 1;   // costura lateral
const MARGEM_CINTURA = 1;   // costura na cintura (onde encontra o cós)
const MARGEM_BARRA = 4;     // margem de barra (dobra da bainha)
const MARGEM_ZIPER = 1.5;   // margem extra no centro das costas (zíper)

let pedidoGlobal = null;
let resultadoGlobal = null;

const DEFS_SETA = `<defs><marker id="seta" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5"/></marker></defs>`;

// ===== Monta um painel (frente OU costas), com pence + engenharia do molde =====
function construirPainel(larguraQuadril, larguraCintura, altura, proporcaoPence, margemEsquerda) {
  let diferenca = larguraQuadril - larguraCintura;
  if (diferenca < 0) diferenca = 0;

  const alturaQuadril = Math.min(20, altura * 0.4);
  const profundidadeBase = Math.max(0, Math.min(10, altura * 0.3, alturaQuadril * 0.9));
  const profundidadePence = profundidadeBase * proporcaoPence;
  const centroX = larguraQuadril * 0.6;
  const penceEsq = centroX - diferenca / 2;
  const penceDir = centroX + diferenca / 2;
  const temPence = diferenca > 0.3;

  // Linha de costura: segue a silhueta real, incluindo a pence
  const pathCostura = temPence
    ? `M 0 0 L ${penceEsq.toFixed(2)} 0 L ${centroX.toFixed(2)} ${profundidadePence.toFixed(2)} L ${penceDir.toFixed(2)} 0 L ${larguraQuadril.toFixed(2)} 0 L ${larguraQuadril.toFixed(2)} ${altura.toFixed(2)} L 0 ${altura.toFixed(2)} Z`
    : `M 0 0 L ${larguraQuadril.toFixed(2)} 0 L ${larguraQuadril.toFixed(2)} ${altura.toFixed(2)} L 0 ${altura.toFixed(2)} Z`;

  // Linha de corte: retângulo liso (a pence NÃO é recortada do tecido - ela é
  // apenas costurada depois; o corte real do tecido é uma linha reta)
  const corteEsq = -margemEsquerda;
  const corteDir = larguraQuadril + MARGEM_LATERAL;
  const corteTopo = -MARGEM_CINTURA;
  const corteBase = altura + MARGEM_BARRA;
  const pathCorte = `M ${corteEsq.toFixed(2)} ${corteTopo.toFixed(2)} L ${corteDir.toFixed(2)} ${corteTopo.toFixed(2)} L ${corteDir.toFixed(2)} ${corteBase.toFixed(2)} L ${corteEsq.toFixed(2)} ${corteBase.toFixed(2)} Z`;

  return {
    pathCostura, pathCorte, temPence,
    corteEsq, corteDir, corteTopo, corteBase,
    largura: larguraQuadril, altura
  };
}

// ===== Monta o SVG completo de uma peça (frente ou costas) =====
function montarPeca(painel, nome, temDobra, temZiper) {
  const cor = "var(--t)";
  let extras = "";

  extras += `<path d="${painel.pathCorte}" fill="none" stroke="var(--text-muted)" stroke-width="0.12" stroke-dasharray="1.2 1"/>`;
  extras += `<path d="${painel.pathCostura}" fill="none" stroke="${cor}" stroke-width="0.3"/>`;

  if (temZiper) {
    const zY = painel.altura * 0.35;
    extras += `<line x1="0" y1="0" x2="0" y2="${zY.toFixed(2)}" stroke="${cor}" stroke-width="0.15" stroke-dasharray="0.8 0.6"/>`;
    extras += `<line x1="0" y1="${zY.toFixed(2)}" x2="0" y2="${painel.altura.toFixed(2)}" stroke="${cor}" stroke-width="0.3"/>`;
  } else if (temDobra) {
    extras += `<line x1="0" y1="0" x2="0" y2="${painel.altura.toFixed(2)}" stroke="${cor}" stroke-width="0.15" stroke-dasharray="0.8 0.6"/>`;
  }

  // Fio do tecido (seta dupla)
  const grainX = painel.largura / 2;
  extras += `<line x1="${grainX.toFixed(2)}" y1="${(painel.altura * 0.2).toFixed(2)}" x2="${grainX.toFixed(2)}" y2="${(painel.altura * 0.8).toFixed(2)}" stroke="${cor}" stroke-width="0.15" marker-start="url(#seta)" marker-end="url(#seta)"/>`;

  // Entalhes (marcas de referência) na cintura e na barra, lado da lateral
  extras += `<line x1="${painel.largura.toFixed(2)}" y1="-0.3" x2="${painel.largura.toFixed(2)}" y2="0.3" stroke="${cor}" stroke-width="0.3"/>`;
  extras += `<line x1="${painel.largura.toFixed(2)}" y1="${(painel.altura - 0.3).toFixed(2)}" x2="${painel.largura.toFixed(2)}" y2="${(painel.altura + 0.3).toFixed(2)}" stroke="${cor}" stroke-width="0.3"/>`;

  return {
    nome,
    svgConteudo: extras,
    viewBox: `${painel.corteEsq.toFixed(2)} ${painel.corteTopo.toFixed(2)} ${(painel.corteDir - painel.corteEsq).toFixed(2)} ${(painel.corteBase - painel.corteTopo).toFixed(2)}`,
    largura: painel.corteDir - painel.corteEsq,
    altura: painel.corteBase - painel.corteTopo,
    temPence: painel.temPence
  };
}

// ===== Cós (tira separada, mais simples) =====
function montarCos(larguraNet, alturaNet) {
  const margem = MARGEM_LATERAL;
  const corteEsq = -margem, corteDir = larguraNet + margem;
  const corteTopo = 0, corteBase = alturaNet;

  const cor = "var(--t)";
  let extras = "";
  extras += `<rect x="${corteEsq.toFixed(2)}" y="${corteTopo.toFixed(2)}" width="${(corteDir - corteEsq).toFixed(2)}" height="${alturaNet.toFixed(2)}" fill="none" stroke="var(--text-muted)" stroke-width="0.12" stroke-dasharray="1.2 1"/>`;
  extras += `<rect x="0" y="0" width="${larguraNet.toFixed(2)}" height="${alturaNet.toFixed(2)}" fill="none" stroke="${cor}" stroke-width="0.3"/>`;
  extras += `<line x1="0" y1="${(alturaNet / 2).toFixed(2)}" x2="${larguraNet.toFixed(2)}" y2="${(alturaNet / 2).toFixed(2)}" stroke="${cor}" stroke-width="0.15" stroke-dasharray="0.8 0.6"/>`;

  return {
    nome: "Cós (tira separada) 1x",
    svgConteudo: extras,
    viewBox: `${corteEsq.toFixed(2)} 0 ${(corteDir - corteEsq).toFixed(2)} ${alturaNet.toFixed(2)}`,
    largura: corteDir - corteEsq,
    altura: alturaNet,
    temPence: false
  };
}

function gerarMoldeSaiaReta(medidas) {
  const cintura = medidas.cintura_saia;
  const quadril = medidas.quadril_saia;
  const comprimento = medidas.comprimento_saia;

  const folgaQuadril = 2;
  const folgaCintura = 1;

  const larguraQuadrilQuarto = quadril / 4 + folgaQuadril / 4;
  const larguraCinturaQuarto = cintura / 4 + folgaCintura / 4;

  const diferencaTotal = Math.max(0, larguraQuadrilQuarto - larguraCinturaQuarto);
  const larguraCinturaFrente = larguraQuadrilQuarto - diferencaTotal * 0.4;
  const larguraCinturaCostas = larguraQuadrilQuarto - diferencaTotal * 0.6;

  const painelFrente = construirPainel(larguraQuadrilQuarto, larguraCinturaFrente, comprimento, 0.8, 0);
  const painelCostas = construirPainel(larguraQuadrilQuarto, larguraCinturaCostas, comprimento, 1.2, MARGEM_ZIPER);

  return {
    pecas: [
      montarPeca(painelFrente, "Frente (corte na dobra) 2x", true, false),
      montarPeca(painelCostas, "Costas (com costura central) 2x", false, true),
      montarCos(larguraCinturaQuarto * 2, 8)
    ]
  };
}

async function gerarMoldeAntigo(pedido) {
  const { data: moldesBase, error } = await supabaseClient
    .from("moldes_base").select("*").eq("tipo_peca", pedido.tipo_peca).limit(1);
  if (error || !moldesBase || moldesBase.length === 0) return null;
  const moldeBase = moldesBase[0];
  const medidasPadrao = moldeBase.medidas_padrao;
  const escalaX = pedido.medidas[moldeBase.eixo_x] / medidasPadrao[moldeBase.eixo_x];
  const escalaY = pedido.medidas[moldeBase.eixo_y] / medidasPadrao[moldeBase.eixo_y];
  return {
    pecas: [{
      nome: nomesTipoPeca[pedido.tipo_peca] || pedido.tipo_peca,
      svgConteudo: `<g transform="scale(${escalaX}, ${escalaY})"><path d="${moldeBase.path_svg}" fill="none" stroke="var(--t)" stroke-width="0.3"/></g>`,
      viewBox: `${moldeBase.viewbox.split(" ").slice(0,2).join(" ")} ${moldeBase.viewbox.split(" ")[2]*escalaX} ${moldeBase.viewbox.split(" ")[3]*escalaY}`,
      largura: pedido.medidas[moldeBase.eixo_x],
      altura: pedido.medidas[moldeBase.eixo_y],
      temPence: false
    }]
  };
}

function renderizarPeca(peca) {
  const alturaDisplay = Math.round(200 * (peca.altura / peca.largura));
  return `
    <div style="display:inline-block; margin:8px; text-align:center; vertical-align:top;">
      <p style="font-size:0.8rem; font-weight:bold; margin-bottom:4px;">${peca.nome}</p>
      <svg viewBox="${peca.viewBox}" width="200" height="${alturaDisplay}" xmlns="http://www.w3.org/2000/svg" style="background:white; border-radius:8px; border:1px solid #eee;">
        ${DEFS_SETA}
        ${peca.svgConteudo}
      </svg>
    </div>
  `;
}

async function carregarMolde() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = "conta.html"; return; }

  const { data: pedidos, error: erroPedido } = await supabaseClient
    .from("pedidos_de_molde").select("*").eq("usuario_id", session.user.id)
    .eq("status", "medidas_informadas").order("data_criacao", { ascending: false }).limit(1);

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

  if (!resultado) { document.getElementById("sem-molde").style.display = "block"; return; }
  resultadoGlobal = resultado;

  document.getElementById("molde-titulo").textContent =
    "Peça: " + (nomesTipoPeca[pedido.tipo_peca] || pedido.tipo_peca);

  document.getElementById("molde-svg-container").innerHTML =
    resultado.pecas.map(renderizarPeca).join("");

  const avisoExtra = document.getElementById("molde-aviso-extra");
  if (pedido.tipo_peca === "saia_reta") {
    avisoExtra.textContent = "✅ Linha de costura + linha de corte (com margens reais), fio do tecido e entalhes já incluídos.";
    avisoExtra.style.display = "block";
  } else {
    avisoExtra.style.display = "none";
  }

  document.getElementById("resultado-molde").style.display = "block";

  await supabaseClient.from("pedidos_de_molde").update({ status: "molde_gerado" }).eq("id", pedido.id);
}

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
      doc.text(`Reduzido em ${Math.round(fatorReducao * 100)}% - NAO esta em tamanho real.`, margemCm, margemCm + 1.2);
      doc.setTextColor(0, 0, 0);

      const yDesenho = margemCm + 1.8;
      await doc.svg(todosSvgs[i], { x: margemCm, y: yDesenho, width: larguraDesenho, height: alturaDesenho });

      const yCalibracao = yDesenho + alturaDesenho + 1.5;
      doc.setDrawColor(212, 106, 143);
      doc.setLineWidth(0.03);
      doc.rect(margemCm, yCalibracao, 5, 5);
      doc.setFontSize(8);
      doc.text("Quadrado de calibracao: 5 x 5 cm apos impresso.", margemCm + 5.5, yCalibracao + 1.2);
      doc.text("Imprima em \"Tamanho real / 100%\".", margemCm + 5.5, yCalibracao + 1.8);
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
