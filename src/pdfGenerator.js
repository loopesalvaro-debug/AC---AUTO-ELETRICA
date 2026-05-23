import jsPDF from "jspdf";

const margem = 14;
const larguraPagina = 210;
const alturaPagina = 297;
const larguraUtil = larguraPagina - margem * 2;

function addHeader(doc, numero) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("RELATÓRIO DE SERVIÇO", margem, 18);
  doc.setFontSize(10);
  doc.text(`Nº ${numero}`, larguraPagina - margem, 18, { align: "right" });
  doc.setDrawColor(30, 41, 59);
  doc.line(margem, 23, larguraPagina - margem, 23);
}

function addFooter(doc) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(
    "Relatório elaborado de forma técnica e profissional para registro dos serviços executados.",
    margem,
    286
  );
  doc.setTextColor(0);
}

function ensureSpace(doc, y, needed, numero) {
  if (y + needed > 275) {
    addFooter(doc);
    doc.addPage();
    addHeader(doc, numero);
    return 32;
  }
  return y;
}

function labelValue(doc, label, value, y) {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`${label}:`, margem, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(value || "-"), margem + 42, y);
  return y + 7;
}

function sectionTitle(doc, title, y, numero) {
  y = ensureSpace(doc, y, 12, numero);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, margem, y);
  return y + 7;
}

function paragraph(doc, text, y, numero) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(text || "-", larguraUtil);
  for (const line of lines) {
    y = ensureSpace(doc, y, 6, numero);
    doc.text(line, margem, y);
    y += 5;
  }
  return y + 3;
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function getImageInfo(file) {
  const dataUrl = await readImageAsDataUrl(file);
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });
  return { dataUrl, width: img.width, height: img.height };
}

export async function gerarPDF(relatorio, fotos, abrirEmNovaAba = true) {
  const doc = new jsPDF("p", "mm", "a4");
  const numero = relatorio.numero || "---/----";
  addHeader(doc, numero);

  let y = 34;
  y = labelValue(doc, "Cliente", relatorio.cliente, y);
  y = labelValue(doc, "Veículo", relatorio.veiculo, y);
  y = labelValue(doc, "Data recebimento", relatorio.dataRecebimento, y);
  y = labelValue(doc, "Data entrega", relatorio.dataEntrega, y);
  y += 4;

  y = sectionTitle(doc, "Problema Relatado pelo Cliente", y, numero);
  y = paragraph(doc, relatorio.problema, y, numero);

  y = sectionTitle(doc, "Diagnóstico Técnico", y, numero);
  y = paragraph(doc, relatorio.diagnostico, y, numero);

  y = sectionTitle(doc, "Serviços Realizados", y, numero);
  const servicos = (relatorio.servicos || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (servicos.length === 0) {
    y = paragraph(doc, "-", y, numero);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const servico of servicos) {
      const lines = doc.splitTextToSize(`• ${servico}`, larguraUtil);
      for (const line of lines) {
        y = ensureSpace(doc, y, 6, numero);
        doc.text(line, margem, y);
        y += 5;
      }
    }
    y += 4;
  }

  y = sectionTitle(doc, "Orçamento / Custos", y, numero);
  const itens = relatorio.itens || [];
  y = ensureSpace(doc, y, 12, numero);
  doc.setFillColor(230, 230, 230);
  doc.rect(margem, y, larguraUtil, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Item", margem + 2, y + 5.5);
  doc.text("Valor (R$)", larguraPagina - margem - 2, y + 5.5, { align: "right" });
  y += 8;
  doc.setFont("helvetica", "normal");

  for (const item of itens) {
    if (!item.nome && !item.valor) continue;
    y = ensureSpace(doc, y, 8, numero);
    doc.rect(margem, y, larguraUtil, 8);
    doc.text(item.nome || "-", margem + 2, y + 5.5);
    const valor = Number(item.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    doc.text(valor, larguraPagina - margem - 2, y + 5.5, { align: "right" });
    y += 8;
  }

  y = ensureSpace(doc, y, 9, numero);
  doc.setFillColor(210, 210, 210);
  doc.rect(margem, y, larguraUtil, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", margem + 2, y + 6);
  doc.text(
    Number(relatorio.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
    larguraPagina - margem - 2,
    y + 6,
    { align: "right" }
  );
  y += 16;

  if (fotos.length) {
    y = sectionTitle(doc, "Registro Fotográfico", y, numero);
    const gap = 6;
    const colW = (larguraUtil - gap) / 2;
    let col = 0;
    let rowY = y;
    let rowH = 0;

    for (const foto of fotos) {
      const info = await getImageInfo(foto.file);
      const ratio = info.height / info.width;
      const imgH = Math.min(colW * ratio, 85);
      const captionLines = doc.splitTextToSize(foto.legenda || "", colW - 4);
      const captionH = foto.legenda ? captionLines.length * 5 + 5 : 0;
      const boxH = imgH + captionH + 2;

      if (col === 0) {
        rowY = ensureSpace(doc, rowY, boxH + 8, numero);
      } else if (rowY + boxH > 275) {
        addFooter(doc);
        doc.addPage();
        addHeader(doc, numero);
        rowY = 32;
        col = 0;
        rowH = 0;
      }

      const x = margem + col * (colW + gap);
      doc.addImage(info.dataUrl, "JPEG", x, rowY, colW, imgH, undefined, "FAST");
      doc.rect(x, rowY, colW, boxH);
      if (foto.legenda) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(captionLines, x + 2, rowY + imgH + 5);
      }

      rowH = Math.max(rowH, boxH);
      if (col === 0) {
        col = 1;
      } else {
        col = 0;
        rowY += rowH + 8;
        rowH = 0;
      }
    }
  }

  addFooter(doc);
  const nomeArquivo = `Relatorio_${numero.replace("/", "-")}.pdf`;
  if (abrirEmNovaAba) {
    doc.save(nomeArquivo);
  }
  return doc.output("blob");
}
