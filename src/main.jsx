import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import { db, firebaseProjectId } from './firebase';
import {
  doc,
  runTransaction,
  serverTimestamp,
  collection,
  addDoc
} from 'firebase/firestore';
import { FileText, Plus, Trash2, Camera, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import './styles.css';

const emptyForm = {
  cliente: '',
  veiculo: '',
  placa: '',
  km: '',
  dataRecebimento: '',
  dataEntrega: '',
  problema: '',
  diagnostico: '',
  conclusao: 'Relatório elaborado de forma técnica e profissional para registro dos serviços executados.'
};

function moneyBR(value) {
  const n = Number(value || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dateBR(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function pad3(n) {
  return String(n).padStart(3, '0');
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function imageDataToJpeg(dataUrl, maxWidth = 1500, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function getNextReportNumber() {
  const year = new Date().getFullYear();
  const counterRef = doc(db, 'contadores', String(year));

  try {
    const next = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const current = counterDoc.exists() ? Number(counterDoc.data().ultimo || 0) : 0;
      const proximo = current + 1;
      transaction.set(counterRef, {
        ultimo: proximo,
        ano: year,
        atualizadoEm: serverTimestamp()
      }, { merge: true });
      return proximo;
    });

    return {
      numero: `${pad3(next)}/${year}`,
      origem: 'firebase',
      sequencial: next,
      ano: year
    };
  } catch (error) {
    const key = `contador_local_${year}`;
    const current = Number(localStorage.getItem(key) || 0);
    const next = current + 1;
    localStorage.setItem(key, String(next));

    return {
      numero: `${pad3(next)}/${year}`,
      origem: 'local',
      sequencial: next,
      ano: year,
      erroFirebase: `${error.code || 'erro'} - ${error.message || error}`
    };
  }
}

async function trySaveReport(payload) {
  try {
    const ref = await addDoc(collection(db, 'relatorios'), {
      ...payload,
      criadoEm: serverTimestamp()
    });
    return { ok: true, id: ref.id };
  } catch (error) {
    return { ok: false, error: `${error.code || 'erro'} - ${error.message || error}` };
  }
}

function addWrappedText(pdf, text, x, y, maxWidth, lineHeight = 6) {
  if (!text) return y;
  const lines = pdf.splitTextToSize(String(text), maxWidth);
  pdf.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function ensurePage(pdf, y, needed = 25) {
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 18) {
    pdf.addPage();
    return 20;
  }
  return y;
}

async function generatePdf({ form, servicos, custos, fotos, numeroRelatorio }) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  let y = 18;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.text('RELATÓRIO DE SERVIÇO MECÂNICO', margin, y);
  y += 8;

  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 80);
  pdf.text(`Relatório Nº ${numeroRelatorio}`, margin, y);
  y += 8;
  pdf.setTextColor(0, 0, 0);

  pdf.setDrawColor(180);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  const info = [
    ['Cliente', form.cliente],
    ['Veículo', form.veiculo],
    ['Placa', form.placa],
    ['KM', form.km],
    ['Data de recebimento', dateBR(form.dataRecebimento)],
    ['Data de entrega', dateBR(form.dataEntrega)]
  ].filter(([, value]) => value);

  pdf.setFontSize(10);
  info.forEach(([label, value]) => {
    y = ensurePage(pdf, y, 8);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${label}:`, margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(value), margin + 42, y);
    y += 6;
  });

  const sections = [
    ['Problema Relatado pelo Cliente', form.problema],
    ['Diagnóstico Técnico', form.diagnostico]
  ];

  sections.forEach(([title, content]) => {
    if (!content) return;
    y += 4;
    y = ensurePage(pdf, y, 25);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(title, margin, y);
    y += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    y = addWrappedText(pdf, content, margin, y, pageWidth - margin * 2, 5.5);
  });

  if (servicos.some(s => s.descricao.trim())) {
    y += 5;
    y = ensurePage(pdf, y, 25);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Serviços Realizados', margin, y);
    y += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    servicos.filter(s => s.descricao.trim()).forEach((s) => {
      y = ensurePage(pdf, y, 10);
      y = addWrappedText(pdf, `• ${s.descricao}`, margin, y, pageWidth - margin * 2, 5.5);
    });
  }

  if (custos.some(c => c.item.trim())) {
    y += 5;
    y = ensurePage(pdf, y, 40);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Orçamento / Custos', margin, y);
    y += 7;

    const tableX = margin;
    const tableW = pageWidth - margin * 2;
    const col1 = tableW - 38;
    const rowH = 8;
    pdf.setFontSize(10);
    pdf.setFillColor(235, 235, 235);
    pdf.rect(tableX, y - 5.5, tableW, rowH, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.text('Item', tableX + 2, y);
    pdf.text('Valor', tableX + col1 + 2, y);
    y += rowH;

    pdf.setFont('helvetica', 'normal');
    let total = 0;
    custos.filter(c => c.item.trim()).forEach(c => {
      y = ensurePage(pdf, y, 12);
      const valor = Number(c.valor || 0);
      total += valor;
      pdf.rect(tableX, y - 5.5, tableW, rowH);
      pdf.text(String(c.item), tableX + 2, y, { maxWidth: col1 - 4 });
      pdf.text(moneyBR(valor), tableX + col1 + 2, y);
      y += rowH;
    });

    y = ensurePage(pdf, y, 12);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(235, 235, 235);
    pdf.rect(tableX, y - 5.5, tableW, rowH, 'F');
    pdf.rect(tableX, y - 5.5, tableW, rowH);
    pdf.text('TOTAL', tableX + 2, y);
    pdf.text(moneyBR(total), tableX + col1 + 2, y);
    y += rowH + 4;
  }

  if (fotos.length) {
    y += 3;
    y = ensurePage(pdf, y, 35);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Registro Fotográfico', margin, y);
    y += 8;

    for (const foto of fotos) {
      y = ensurePage(pdf, y, 88);
      const jpeg = await imageDataToJpeg(foto.preview);
      const imgProps = pdf.getImageProperties(jpeg);
      const maxW = pageWidth - margin * 2;
      const maxH = 82;
      let imgW = maxW;
      let imgH = imgW * imgProps.height / imgProps.width;
      if (imgH > maxH) {
        imgH = maxH;
        imgW = imgH * imgProps.width / imgProps.height;
      }
      const x = margin + (maxW - imgW) / 2;
      pdf.addImage(jpeg, 'JPEG', x, y, imgW, imgH, undefined, 'FAST');
      y += imgH + 5;
      if (foto.legenda) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(80, 80, 80);
        y = addWrappedText(pdf, foto.legenda, margin, y, pageWidth - margin * 2, 5.5);
        pdf.setTextColor(0, 0, 0);
      }
      y += 6;
    }
  }

  if (form.conclusao) {
    y = ensurePage(pdf, y, 25);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    addWrappedText(pdf, form.conclusao, margin, y, pageWidth - margin * 2, 5.5);
  }

  const safeNumber = numeroRelatorio.replace('/', '-');
  const cliente = form.cliente ? form.cliente.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'cliente';
  pdf.save(`relatorio_${safeNumber}_${cliente}.pdf`);
}

function App() {
  const [form, setForm] = useState(emptyForm);
  const [servicos, setServicos] = useState([{ descricao: '' }]);
  const [custos, setCustos] = useState([{ item: '', valor: '' }]);
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const total = useMemo(() => custos.reduce((sum, c) => sum + Number(c.valor || 0), 0), [custos]);

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    const mapped = await Promise.all(files.map(async (file) => ({
      id: `${Date.now()}-${Math.random()}`,
      fileName: file.name,
      legenda: '',
      preview: await readFileAsDataURL(file)
    })));
    setFotos(prev => [...prev, ...mapped]);
    event.target.value = '';
  }

  async function handleGenerate() {
    setLoading(true);
    setMessage(null);
    try {
      const numberInfo = await getNextReportNumber();
      const numeroRelatorio = numberInfo.numero;

      const payload = {
        numeroRelatorio,
        numeroOrigem: numberInfo.origem,
        cliente: form.cliente,
        veiculo: form.veiculo,
        placa: form.placa,
        km: form.km,
        dataRecebimento: form.dataRecebimento,
        dataEntrega: form.dataEntrega,
        problema: form.problema,
        diagnostico: form.diagnostico,
        conclusao: form.conclusao,
        servicos: servicos.filter(s => s.descricao.trim()),
        custos: custos.filter(c => c.item.trim()),
        total,
        fotos: fotos.map(f => ({ fileName: f.fileName, legenda: f.legenda })),
        projetoFirebaseUsado: firebaseProjectId
      };

      const saveResult = await trySaveReport(payload);
      await generatePdf({ form, servicos, custos, fotos, numeroRelatorio });

      if (saveResult.ok && numberInfo.origem === 'firebase') {
        setMessage({ type: 'success', text: `PDF gerado e relatório salvo no Firebase. Número: ${numeroRelatorio}` });
      } else if (saveResult.ok && numberInfo.origem === 'local') {
        setMessage({ type: 'warning', text: `PDF gerado. Numeração local usada: ${numeroRelatorio}. Firebase não respondeu: ${numberInfo.erroFirebase}` });
      } else {
        setMessage({ type: 'warning', text: `PDF gerado. Não salvou no Firebase, mas o PDF foi baixado. Erro: ${saveResult.error || numberInfo.erroFirebase}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Não foi possível gerar o PDF: ${error.message || error}` });
    } finally {
      setLoading(false);
    }
  }

  function handleDraftPdf() {
    generatePdf({ form, servicos, custos, fotos, numeroRelatorio: 'RASCUNHO' });
  }

  function clearAll() {
    if (!confirm('Deseja limpar todo o formulário?')) return;
    setForm(emptyForm);
    setServicos([{ descricao: '' }]);
    setCustos([{ item: '', valor: '' }]);
    setFotos([]);
    setMessage(null);
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">AC Auto Elétrica</p>
          <h1>Gerador de Relatório de Serviço</h1>
          <p>Preencha os dados, adicione fotos com legenda e gere um PDF profissional.</p>
        </div>
        <div className="statusCard">
          <strong>Firebase:</strong> {firebaseProjectId}<br />
          <span>Storage desativado nesta versão</span>
        </div>
      </header>

      <main className="card">
        <section className="section">
          <h2><FileText size={20} /> Dados do relatório</h2>
          <div className="grid two">
            <label>Cliente<input value={form.cliente} onChange={e => updateForm('cliente', e.target.value)} placeholder="Nome do cliente" /></label>
            <label>Veículo<input value={form.veiculo} onChange={e => updateForm('veiculo', e.target.value)} placeholder="Ex.: Fiat Argo" /></label>
            <label>Placa<input value={form.placa} onChange={e => updateForm('placa', e.target.value)} placeholder="ABC1D23" /></label>
            <label>KM<input value={form.km} onChange={e => updateForm('km', e.target.value)} placeholder="Ex.: 85.000" /></label>
            <label>Data de recebimento<input type="date" value={form.dataRecebimento} onChange={e => updateForm('dataRecebimento', e.target.value)} /></label>
            <label>Data de entrega<input type="date" value={form.dataEntrega} onChange={e => updateForm('dataEntrega', e.target.value)} /></label>
          </div>
        </section>

        <section className="section">
          <h2>Descrição técnica</h2>
          <label>Problema relatado pelo cliente<textarea value={form.problema} onChange={e => updateForm('problema', e.target.value)} placeholder="Descreva o problema informado pelo cliente" /></label>
          <label>Diagnóstico técnico<textarea value={form.diagnostico} onChange={e => updateForm('diagnostico', e.target.value)} placeholder="Descreva o diagnóstico realizado" /></label>
        </section>

        <section className="section">
          <div className="sectionHeader">
            <h2>Serviços realizados</h2>
            <button type="button" className="ghost" onClick={() => setServicos([...servicos, { descricao: '' }])}><Plus size={16} /> Adicionar</button>
          </div>
          {servicos.map((s, index) => (
            <div className="row" key={index}>
              <input value={s.descricao} onChange={e => setServicos(prev => prev.map((item, i) => i === index ? { descricao: e.target.value } : item))} placeholder="Ex.: Substituição do kit de embreagem" />
              <button type="button" className="iconBtn" onClick={() => setServicos(prev => prev.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
            </div>
          ))}
        </section>

        <section className="section">
          <div className="sectionHeader">
            <h2>Orçamento / Custos</h2>
            <button type="button" className="ghost" onClick={() => setCustos([...custos, { item: '', valor: '' }])}><Plus size={16} /> Adicionar</button>
          </div>
          {custos.map((c, index) => (
            <div className="costRow" key={index}>
              <input value={c.item} onChange={e => setCustos(prev => prev.map((item, i) => i === index ? { ...item, item: e.target.value } : item))} placeholder="Item" />
              <input type="number" step="0.01" value={c.valor} onChange={e => setCustos(prev => prev.map((item, i) => i === index ? { ...item, valor: e.target.value } : item))} placeholder="Valor" />
              <button type="button" className="iconBtn" onClick={() => setCustos(prev => prev.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
            </div>
          ))}
          <div className="total">Total: {moneyBR(total)}</div>
        </section>

        <section className="section">
          <h2><Camera size={20} /> Registro fotográfico</h2>
          <label className="uploadBox">
            <input type="file" accept="image/*" multiple onChange={handleFiles} />
            Clique para adicionar fotos
          </label>

          <div className="photoGrid">
            {fotos.map((foto, index) => (
              <div className="photoCard" key={foto.id}>
                <img src={foto.preview} alt={`Foto ${index + 1}`} />
                <input value={foto.legenda} onChange={e => setFotos(prev => prev.map(f => f.id === foto.id ? { ...f, legenda: e.target.value } : f))} placeholder="Legenda da foto" />
                <button type="button" className="deletePhoto" onClick={() => setFotos(prev => prev.filter(f => f.id !== foto.id))}>Remover</button>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <h2>Conclusão</h2>
          <textarea value={form.conclusao} onChange={e => updateForm('conclusao', e.target.value)} />
        </section>

        <div className="actions">
          <button type="button" className="primary" onClick={handleGenerate} disabled={loading}><Save size={18} /> {loading ? 'Gerando...' : 'Salvar e gerar PDF'}</button>
          <button type="button" onClick={handleDraftPdf}><FileText size={18} /> Gerar rascunho</button>
          <button type="button" onClick={clearAll}><RotateCcw size={18} /> Limpar</button>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.type !== 'success' && <AlertTriangle size={18} />}
            <span>{message.text}</span>
          </div>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
