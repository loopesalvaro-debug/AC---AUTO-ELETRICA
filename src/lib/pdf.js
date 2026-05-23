import jsPDF from "jspdf";

export function money(value) {
  const number = Number(value || 0);
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateBR(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function splitText(doc, text, maxWidth) {
  return doc.splitTextToSize(String(text || ""), maxWidth);
}

function addWrappedText(doc, label, text, x, y, width) {
  doc.setFont("helvetica", "bold");
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  const lines = splitText(doc, text || "-", width);
  doc.text(lines, x, y + 6);
  return y + 8 + lines.length * 5;
}

function ensureSpace(doc, y, needed = 35) {
  if (y + needed > 285) {
    doc.addPage();
    return 18;
  }
  return y;
}

function getImageSizeFit(imgWidth, imgHeight, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
  return { width: imgWidth * ratio, height: imgHeight * ratio };
}

async function getImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 1200, height: 900 });
    img.src = dataUrl;
  });
}

export async function generateReportPDF(report, photos = []) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("RELATÓRIO DE SERVIÇO", margin, y);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Nº ${report.numero || "---"}`, pageWidth - margin, y, { align: "right" });
  y += 10;

  doc.setDrawColor(20, 20, 20);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  const left = margin;
  const right = 108;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente", left, y);
  doc.text("Veículo", right, y);
  doc.setFont("helvetica", "normal");
  doc.text(report.cliente || "-", left, y + 6);
  doc.text(report.veiculo || "-", right, y + 6);
  y += 15;

  doc.setFont("helvetica", "bold");
  doc.text("Data de recebimento", left, y);
  doc.text("Data de entrega", right, y);
  doc.setFont("helvetica", "normal");
  doc.text(formatDateBR(report.dataRecebimento) || "-", left, y + 6);
  doc.text(formatDateBR(report.dataEntrega) || "-", right, y + 6);
  y += 14;

  y = addWrappedText(doc, "Problema Relatado pelo Cliente", report.problema, margin, y, 180);
  y = ensureSpace(doc, y, 28);
  y = addWrappedText(doc, "Diagnóstico Técnico", report.diagnostico, margin, y, 180);
  y = ensureSpace(doc, y, 28);

  doc.setFont("helvetica", "bold");
  doc.text("Serviços Realizados", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const servicos = splitText(doc, report.servicos || "-", 180);
  doc.text(servicos, margin, y);
  y += servicos.length * 5 + 8;

  y = ensureSpace(doc, y, 55);
  doc.setFont("helvetica", "bold");
  doc.text("Orçamento / Custos", margin, y);
  y += 7;

  const tableX = margin;
  const tableW = pageWidth - margin * 2;
  const itemW = 130;
  doc.setFillColor(235, 235, 235);
  doc.rect(tableX, y - 5, tableW, 8, "F");
  doc.setFontSize(10);
  doc.text("Item", tableX + 3, y);
  doc.text("Valor", tableX + itemW + 3, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  const items = Array.isArray(report.itens) ? report.itens : [];
  for (const item of items) {
    y = ensureSpace(doc, y, 12);
    const desc = item.descricao || "-";
    const valor = money(item.valor);
    const lines = splitText(doc, desc, itemW - 6);
    const rowH = Math.max(8, lines.length * 5 + 3);
    doc.rect(tableX, y - 5, tableW, rowH);
    doc.line(tableX + itemW, y - 5, tableX + itemW, y - 5 + rowH);
    doc.text(lines, tableX + 3, y);
    doc.text(valor, tableX + itemW + 3, y);
    y += rowH;
  }

  y = ensureSpace(doc, y, 14);
  const total = items.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(220, 220, 220);
  doc.rect(tableX, y - 5, tableW, 9, "F");
  doc.rect(tableX, y - 5, tableW, 9);
  doc.line(tableX + itemW, y - 5, tableX + itemW, y + 4);
  doc.text("TOTAL", tableX + 3, y);
  doc.text(money(total), tableX + itemW + 3, y);
  y += 16;

  if (photos.length > 0) {
    y = ensureSpace(doc, y, 35);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("Registro Fotográfico", margin, y);
    y += 8;

    const cardW = 84;
    const gap = 8;
    const imgMaxH = 62;
    const colX = [margin, margin + cardW + gap];
    let col = 0;

    for (const photo of photos) {
      if (!photo.dataUrl) continue;
      const caption = photo.caption || "";
      const dims = await getImageDimensions(photo.dataUrl);
      const fit = getImageSizeFit(dims.width, dims.height, cardW, imgMaxH);
      const captionLines = splitText(doc, caption, cardW - 4);
      const captionH = caption ? captionLines.length * 5 + 4 : 0;
      const cardH = fit.height + captionH + 4;

      if (y + cardH > 282) {
        doc.addPage();
        y = 18;
        col = 0;
      }

      const x = colX[col];
      doc.setDrawColor(210, 210, 210);
      doc.rect(x, y, cardW, cardH);
      const imgX = x + (cardW - fit.width) / 2;
      doc.addImage(photo.dataUrl, "JPEG", imgX, y + 2, fit.width, fit.height, undefined, "FAST");
      if (caption) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(captionLines, x + 2, y + fit.height + 8);
      }

      if (col === 0) {
        col = 1;
      } else {
        col = 0;
        y += cardH + 8;
      }
    }
    if (col === 1) y += 76;
  }

  y = ensureSpace(doc, y, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório elaborado de forma técnica e profissional para registro dos serviços executados.", margin, y + 8);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, 292, { align: "right" });
  }

  const safeNumber = String(report.numero || "relatorio").replaceAll("/", "-");
  doc.save(`Relatorio_${safeNumber}.pdf`);
}
