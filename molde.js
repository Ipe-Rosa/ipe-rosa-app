const SUPABASE_URL = "https://ksognpzaasjevupohfdv.supabase.co";
const SUPABASE_KEY = "sb_publishable_8rt9qB9SbfcAi0rfjhYv9A_7k5pQ6PO";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const nomesTipoPeca = {
  camiseta_basica: "Camiseta básica",
  saia_reta: "Saia reta",
  calca_reta: "Calça reta"
};

const MARGEM_LATERAL = 1;
const MARGEM_CINTURA = 1;
const MARGEM_BARRA = 4;
const MARGEM_ZIPER = 1.5;

const COR_COSTURA = "#d46a8f";
const COR_CORTE = "#bbbbbb";

let pedidoGlobal = null;
let resultadoGlobal = null;
let previaGlobal = null;

const DEFS_SETA = `<defs><marker id="seta" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5"/></marker></defs>`;

function construirPainel(larguraQuadril, larguraCintura, altura, proporcaoPence, margemEsquerda) {
  let diferenca = larguraQuadril - larguraCintura;
  if (diferenca < 0) diferenca = 0;

  const reducaoLateral = diferenca * 0.3;
  const diferencaPence = diferenca - reducaoLateral;
  const larguraTopo = larguraQuadril - reducaoLateral;

  const alturaQuadril = Math.min(20, altura * 0.4);
  const profundidadeBase = Math.max(0, Math.min(10, altura * 0.3, alturaQuadril * 0.9));
  const profundidadePence = profundidadeBase * proporcaoPence;
  const centroX = Math.min(larguraQuadril * 0.6, larguraTopo - 1);
  const penceEsq = Math.max(0, centroX - diferencaPence / 2);
  const penceDir = Math.min(larguraTopo, centroX + diferencaPence / 2);
  const temPence = diferencaPence > 0.3;
  const temCurvaLateral = reducaoLateral > 0.3;

  const curvaLateral = temCurvaLateral
    ? `Q ${larguraQuadril.toFixed(2)} ${(alturaQuadril * 0.3).toFixed(2)} ${larguraTopo.toFixed(2)} 0`
    : `L ${larguraTopo.toFixed(2)} 0`;

  const pathCostura = temPence
    ? `M 0 ${altura.toFixed(2)} L ${larguraQuadril.toFixed(2)} ${altura.toFixed(2)} L ${larguraQuadril.toFixed(2)} ${alturaQuadril.toFixed(2)} ${curvaLateral} L ${penceDir.toFixed(2)} 0 L ${centroX.toFixed(2)} ${profundidadePence.toFixed(2)} L ${penceEsq.toFixed(2)} 0 L 0 0 Z`
    : `M 0 ${altura.toFixed(2)} L ${larguraQuadril.toFixed(2)} ${altura.toFixed(2)} L ${larguraQuadril.toFixed(2)} ${alturaQuadril.toFixed(2)} ${curvaLateral} L 0 0 Z`;

  const corteEsq = -margemEsquerda;
  const corteDir = larguraQuadril + MARGEM_LATERAL;
  const corteTopo = -MARGEM_CINTURA;
  const corteBase = altura + MARGEM_BARRA;
  const pathCorte = `M ${corteEsq.toFixed(2)} ${corteTopo.toFixed(2)} L ${corteDir.toFixed(2)} ${corteTopo.toFixed(2)} L ${corteDir.toFixed(2)} ${corteBase.toFixed(2)} L ${corteEsq.toFixed(2)} ${corteBase.toFixed(2)} Z`;

return {
    pathCostura, pathCorte, temPence,
    corteEsq, corteDir, corteTopo, corteBase,
    largura: larguraQuadril, altura, larguraTopo, alturaQuadril,
    centroX, profundidadePence
  };
}

function montarPeca(painel, nome, temDobra, temZiper) {
  let extras = "";

  extras += `<path d="${painel.pathCorte}" fill="none" stroke="${COR_CORTE}" stroke-width="0.12" stroke-dasharray="1.2 1"/>`;
  extras += `<path d="${painel.pathCostura}" fill="none" stroke="${COR_COSTURA}" stroke-width="0.3"/>`;

  if (painel.temPence) {
    extras += `<line x1="${painel.centroX.toFixed(2)}" y1="0" x2="${painel.centroX.toFixed(2)}" y2="${painel.profundidadePence.toFixed(2)}" stroke="${COR_COSTURA}" stroke-width="0.15" stroke-dasharray="0.6 0.5"/>`;
  }

  if (temZiper) {
    const zY = painel.altura * 0.35;
    extras += `<line x1="0" y1="0" x2="0" y2="${zY.toFixed(2)}" stroke="#c0392b" stroke-width="0.25" stroke-dasharray="0.8 0.6"/>`;
    extras += `<line x1="0" y1="${zY.toFixed(2)}" x2="0" y2="${painel.altura.toFixed(2)}" stroke="${COR_COSTURA}" stroke-width="0.3"/>`;
    extras += `<text x="0.6" y="${(zY / 2).toFixed(2)}" font-size="2.4" fill="#c0392b">abertura zíper</text>`;
  } else if (temDobra) {
    extras += `<line x1="0" y1="0" x2="0" y2="${painel.altura.toFixed(2)}" stroke="${COR_COSTURA}" stroke-width="0.15" stroke-dasharray="0.8 0.6"/>`;
    extras += `<text x="0.6" y="${(painel.altura / 2).toFixed(2)}" font-size="2.4" fill="${COR_COSTURA}">dobra</text>`;
  }

  // Fio do tecido - deslocado pra direita, deixando espaço livre pras medidas
  const grainX = painel.largura * 0.8;
  const grainY1 = painel.altura * 0.35;
  const grainY2 = painel.altura * 0.65;
  extras += `<line x1="${grainX.toFixed(2)}" y1="${grainY1.toFixed(2)}" x2="${grainX.toFixed(2)}" y2="${grainY2.toFixed(2)}" stroke="${COR_COSTURA}" stroke-width="0.15" marker-start="url(#seta)" marker-end="url(#seta)"/>`;

  // Medidas escritas direto no desenho
  const xMedida = painel.largura * 0.06;
  extras += `<text x="${xMedida.toFixed(2)}" y="4" font-size="2.1" fill="${COR_COSTURA}">cintura ${painel.larguraTopo.toFixed(0)}cm</text>`;
  extras += `<text x="${xMedida.toFixed(2)}" y="${Math.max(9, painel.alturaQuadril - 3).toFixed(2)}" font-size="2.1" fill="${COR_COSTURA}">quadril ${painel.largura.toFixed(0)}cm</text>`;
  extras += `<text x="${xMedida.toFixed(2)}" y="${(painel.altura - 3).toFixed(2)}" font-size="2.1" fill="${COR_COSTURA}">comprimento ${painel.altura.toFixed(0)}cm</text>`;

  // Entalhes na lateral
  extras += `<line x1="${painel.largura.toFixed(2)}" y1="-0.3" x2="${painel.largura.toFixed(2)}" y2="0.3" stroke="${COR_COSTURA}" stroke-width="0.3"/>`;
  extras += `<line x1="${painel.largura.toFixed(2)}" y1="${(painel.altura - 0.3).toFixed(2)}" x2="${painel.largura.toFixed(2)}" y2="${(painel.altura + 0.3).toFixed(2)}" stroke="${COR_COSTURA}" stroke-width="0.3"/>`;

  return {
    nome,
    svgConteudo: extras,
    viewBox: `${painel.corteEsq.toFixed(2)} ${painel.corteTopo.toFixed(2)} ${(painel.corteDir - painel.corteEsq).toFixed(2)} ${(painel.corteBase - painel.corteTopo).toFixed(2)}`,
    largura: painel.corteDir - painel.corteEsq,
    altura: painel.corteBase - painel.corteTopo,
    temPence: painel.temPence
  };
}

function montarCos(larguraNet, alturaNet) {
  const margem = MARGEM_LATERAL;
  const corteEsq = -margem, corteDir = larguraNet + margem;

  let extras = "";
  extras += `<rect x="${corteEsq.toFixed(2)}" y="0" width="${(corteDir - corteEsq).toFixed(2)}" height="${alturaNet.toFixed(2)}" fill="none" stroke="${COR_CORTE}" stroke-width="0.12" stroke-dasharray="1.2 1"/>`;
  extras += `<rect x="0" y="0" width="${larguraNet.toFixed(2)}" height="${alturaNet.toFixed(2)}" fill="none" stroke="${COR_COSTURA}" stroke-width="0.3"/>`;
  extras += `<line x1="0" y1="${(alturaNet / 2).toFixed(2)}" x2="${larguraNet.toFixed(2)}" y2="${(alturaNet / 2).toFixed(2)}" stroke="${COR_COSTURA}" stroke-width="0.15" stroke-dasharray="0.8 0.6"/>`;
  extras += `<text x="${(larguraNet * 0.3).toFixed(2)}" y="${(alturaNet / 2 - 1).toFixed(2)}" font-size="2.1" fill="${COR_COSTURA}">${larguraNet.toFixed(0)}cm</text>`;

  return {
    nome: "Cós (tira separada) 1x",
    svgConteudo: extras,
    viewBox: `${corteEsq.toFixed(2)} 0 ${(corteDir - corteEsq).toFixed(2)} ${alturaNet.toFixed(2)}`,
    largura: corteDir - corteEsq,
    altura: alturaNet,
    temPence: false
  };
}

// ===== Prévia visual da peça pronta (não é o molde para cortar) =====
function montarPreviaProntas(dadosFrente, dadosCostas) {
  function silhueta(d) {
    const meia = d.largura;
    const topoMeia = d.larguraTopo;
    const alturaQ = d.alturaQuadril;
    const alt = d.altura;
    let svg = `<path d="M -${meia.toFixed(2)} ${alt.toFixed(2)} L -${meia.toFixed(2)} ${alturaQ.toFixed(2)} L -${topoMeia.toFixed(2)} 0 L ${topoMeia.toFixed(2)} 0 L ${meia.toFixed(2)} ${alturaQ.toFixed(2)} L ${meia.toFixed(2)} ${alt.toFixed(2)} Z" fill="none" stroke="${COR_COSTURA}" stroke-width="0.3"/>`;
    svg += `<rect x="-${topoMeia.toFixed(2)}" y="-6" width="${(topoMeia * 2).toFixed(2)}" height="6" fill="none" stroke="${COR_COSTURA}" stroke-width="0.3"/>`;
    svg += `<line x1="0" y1="-6" x2="0" y2="${alt.toFixed(2)}" stroke="${COR_COSTURA}" stroke-width="0.1" stroke-dasharray="0.5 0.8" opacity="0.5"/>`;
    return { svg, largura: meia, altura: alt };
  }

  const frente = silhueta(dadosFrente);
  const costas = silhueta(dadosCostas);
  return { frente, costas };
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

  const previa = montarPreviaProntas(painelFrente, painelCostas);

  return {
    pecas: [
      montarPeca(painelFrente, "Frente (corte na dobra) 2x", true, false),
      montarPeca(painelCostas, "Costas (com costura central) 2x", false, true),
      montarCos(larguraCinturaQuarto * 2, 8)
    ],
    previa
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
  const partesViewbox = moldeBase.viewbox.split(" ");
  return {
    pecas: [{
      nome: nomesTipoPeca[pedido.tipo_peca] || pedido.tipo_peca,
      svgConteudo: `<g transform="scale(${escalaX}, ${escalaY})"><path d="${moldeBase.path_svg}" fill="none" stroke="${COR_COSTURA}" stroke-width="0.3"/></g>`,
      viewBox: `${partesViewbox[0]} ${partesViewbox[1]} ${(partesViewbox[2]*escalaX).toFixed(2)} ${(partesViewbox[3]*escalaY).toFixed(2)}`,
      largura: pedido.medidas[moldeBase.eixo_x],
      altura: pedido.medidas[moldeBase.eixo_y],
      temPence: false
    }],
    previa: null
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

function renderizarPrevia(nome, dados) {
  const viewBox = `${-dados.largura - 1} -7 ${(dados.largura * 2 + 2).toFixed(2)} ${(dados.altura + 8).toFixed(2)}`;
  const alturaDisplay = Math.round(160 * ((dados.altura + 8) / (dados.largura * 2 + 2)));
  return `
    <div style="display:inline-block; margin:8px; text-align:center; vertical-align:top;">
      <p style="font-size:0.75rem; color:#999;">${nome}</p>
      <svg viewBox="${viewBox}" width="160" height="${alturaDisplay}" xmlns="http://www.w3.org/2000/svg" style="background:white; border-radius:8px; border:1px solid #eee;">
        ${dados.svg}
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
    avisoExtra.textContent = "✅ Linha de costura + linha de corte (com margens reais), fio do tecido, entalhes e medidas já incluídos.";
    avisoExtra.style.display = "block";
  } else {
    avisoExtra.style.display = "none";
  }

  if (resultado.previa) {
    document.getElementById("molde-previa-container").innerHTML =
      renderizarPrevia("Frente pronta", resultado.previa.frente) +
      renderizarPrevia("Costas pronta", resultado.previa.costas);
    document.getElementById("molde-previa-wrapper").style.display = "block";
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
