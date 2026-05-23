import jsPDF from "jspdf";

export function money(value) {
  const n = Number(String(value ?? "0").replace(",", ".")) || 0;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseMoney(value) {
  return Number(String(value ?? "0").replace(",", ".")) || 0;
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatDateBR(value) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function splitLines(doc, text, maxWidth) {
  return doc.splitTextToSize(String(text || "-"), maxWidth);
}

function addWrappedText(doc, label, value, x, y, maxWidth) {
  doc.setFont("helvetica", "bold");
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  const lines = splitLines(doc, value, maxWidth);
  doc.text(lines, x, y + 6);
  return y + 8 + lines.length * 5;
}

function ensurePage(doc, y, margin = 14) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y > pageHeight - margin) {
    doc.addPage();
    return 18;
  }
  return y;
}

async function getImageSize(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 1200, height: 900 });
    img.src = dataUrl;
  });
}

export async function generateReportPDF({ report, fotos, numeroRelatorio, draft = false }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("RELATÓRIO DE SERVIÇO MECÂNICO", margin, y);

  doc.setFontSize(11);
  doc.setTextColor(70);
  doc.text(`Nº ${numeroRelatorio}${draft ? " - RASCUNHO" : ""}`, pageWidth - margin, y, { align: "right" });
  doc.setTextColor(0);

  y += 11;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente", margin, y);
  doc.text("Veículo", 82, y);
  doc.text("Recebimento", 140, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(String(report.cliente || "-"), margin, y);
  doc.text(String(report.veiculo || "-"), 82, y);
  doc.text(formatDateBR(report.dataRecebimento) || "-", 140, y);

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Entrega", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(formatDateBR(report.dataEntrega) || "-", margin, y);

  y += 11;
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(12);
  y = addWrappedText(doc, "Problema Relatado pelo Cliente", report.problema, margin, y, 180);
  y += 3;
  y = ensurePage(doc, y);
  y = addWrappedText(doc, "Diagnóstico Técnico", report.diagnostico, margin, y, 180);
  y += 3;
  y = ensurePage(doc, y);
  y = addWrappedText(doc, "Serviços Realizados", report.servicos, margin, y, 180);

  y += 8;
  y = ensurePage(doc, y + 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Orçamento / Custos", margin, y);
  y += 7;

  const tableX = margin;
  const tableW = pageWidth - margin * 2;
  const itemW = 130;
  const valorW = tableW - itemW;
  doc.setFontSize(10);
  doc.setFillColor(230, 230, 230);
  doc.rect(tableX, y, tableW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Item", tableX + 3, y + 5.5);
  doc.text("Valor (R$)", tableX + itemW + 3, y + 5.5);
  y += 8;

  let total = 0;
  doc.setFont("helvetica", "normal");
  (report.itens || []).filter(i => i.descricao || i.valor).forEach((item) => {
    y = ensurePage(doc, y + 9);
    const valor = parseMoney(item.valor);
    total += valor;
    doc.rect(tableX, y, tableW, 8);
    doc.line(tableX + itemW, y, tableX + itemW, y + 8);
    doc.text(String(item.descricao || "-"), tableX + 3, y + 5.5, { maxWidth: itemW - 6 });
    doc.text(money(valor), tableX + itemW + 3, y + 5.5);
    y += 8;
  });

  y = ensurePage(doc, y + 10);
  doc.setFillColor(220, 220, 220);
  doc.rect(tableX, y, tableW, 9, "F");
  doc.rect(tableX, y, tableW, 9);
  doc.line(tableX + itemW, y, tableX + itemW, y + 9);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", tableX + 3, y + 6);
  doc.text(money(total), tableX + itemW + 3, y + 6);
  y += 17;

  if (fotos?.length) {
    y = ensurePage(doc, y + 15);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("Registro Fotográfico", margin, y);
    y += 8;

    const gap = 6;
    const colW = (pageWidth - margin * 2 - gap) / 2;
    const imgMaxH = 72;
    let col = 0;
    let rowY = y;
    let rowH = 0;

    for (const foto of fotos) {
      const x = margin + col * (colW + gap);
      const { width, height } = await getImageSize(foto.dataUrl);
      const ratio = width / height || 1.33;
      let imgW = colW;
      let imgH = imgW / ratio;
      if (imgH > imgMaxH) {
        imgH = imgMaxH;
        imgW = imgH * ratio;
      }
      const captionLines = splitLines(doc, foto.legenda || "", colW - 4);
      const captionH = foto.legenda ? captionLines.length * 5 + 7 : 5;
      const cardH = imgH + captionH + 2;

      if (rowY + cardH > pageHeight - 18) {
        doc.addPage();
        rowY = 18;
        col = 0;
        rowH = 0;
      }

      doc.setDrawColor(210);
      doc.rect(x, rowY, colW, cardH);
      doc.addImage(foto.dataUrl, "JPEG", x + (colW - imgW) / 2, rowY + 2, imgW, imgH);
      if (foto.legenda) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(70);
        doc.text(captionLines, x + 2, rowY + imgH + 8);
        doc.setTextColor(0);
      }

      rowH = Math.max(rowH, cardH);
      if (col === 0) {
        col = 1;
      } else {
        col = 0;
        rowY += rowH + 7;
        rowH = 0;
      }
    }
    y = rowY + rowH + 10;
  }

  y = ensurePage(doc, y + 15);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text("Relatório elaborado de forma técnica e profissional para registro dos serviços executados.", margin, Math.min(y, pageHeight - 18));

  const filename = `Relatorio_${numeroRelatorio.replace("/", "-")}_${(report.cliente || "cliente").replace(/[^a-z0-9]/gi, "_")}.pdf`;
  doc.save(filename);
}
