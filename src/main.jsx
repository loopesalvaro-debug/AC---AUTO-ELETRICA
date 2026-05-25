import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import { FileDown, Plus, Trash2, ImagePlus, RotateCcw } from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'relatorios_servico_contadores_v8';
const DRAFT_KEY = 'relatorios_servico_rascunho_v8';

const emptyForm = {
  cliente: '',
  veiculo: '',
  recebimento: '',
  entrega: '',
  problema: '',
  diagnostico: '',
  servicos: [''],
  custos: [{ item: '', valor: '' }],
  observacaoFinal: 'Relatório elaborado de forma técnica e profissional para registro dos serviços executados.'
};

function brl(value) {
  const n = Number(String(value).replace(',', '.')) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function brDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function getYear() {
  return new Date().getFullYear();
}

function getNextNumberPreview() {
  const year = getYear();
  const raw = localStorage.getItem(STORAGE_KEY);
  const counters = raw ? JSON.parse(raw) : {};
  const next = (counters[year] || 0) + 1;
  return `${String(next).padStart(3, '0')}/${year}`;
}

function commitNextNumber() {
  const year = getYear();
  const raw = localStorage.getItem(STORAGE_KEY);
  const counters = raw ? JSON.parse(raw) : {};
  const next = (counters[year] || 0) + 1;
  counters[year] = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
  return `${String(next).padStart(3, '0')}/${year}`;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fitImage(doc, dataUrl, x, y, maxW, maxH) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const imgX = x + (maxW - w) / 2;
      doc.addImage(dataUrl, 'JPEG', imgX, y, w, h, undefined, 'FAST');
      resolve({ w, h });
    };
    img.onerror = () => resolve({ w: maxW, h: maxH });
    img.src = dataUrl;
  });
}

function addFooter(doc, text) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Página ${i} de ${pageCount}`, 105, 287, { align: 'center' });
    doc.text(text, 15, 281, { maxWidth: 180 });
  }
}

async function generatePdf(form, fotos, numero) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const margin = 15;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 18;

  const ensure = (need) => {
    if (y + need > pageH - 22) {
      doc.addPage();
      y = 18;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('RELATÓRIO DE SERVIÇO', margin, y);
  doc.setFontSize(11);
  doc.text(`Nº ${numero}`, pageW - margin, y, { align: 'right' });
  y += 10;

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  const rows = [
    ['Cliente', form.cliente],
    ['Veículo / Equipamento', form.veiculo],
    ['Data de recebimento', brDate(form.recebimento)],
    ['Data de entrega', brDate(form.entrega)]
  ];

  doc.setFontSize(10);
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || '-'), margin + 45, y);
    y += 7;
  });

  const section = (title, body) => {
    ensure(30);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(title, margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(body || '-', 180);
    lines.forEach(line => {
      ensure(6);
      doc.text(line, margin, y);
      y += 5;
    });
  };

  section('Problema Relatado pelo Cliente', form.problema);
  section('Diagnóstico Técnico', form.diagnostico);

  ensure(30);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Serviços Realizados', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  form.servicos.filter(Boolean).forEach(servico => {
    const lines = doc.splitTextToSize(`• ${servico}`, 178);
    lines.forEach(line => {
      ensure(6);
      doc.text(line, margin, y);
      y += 5;
    });
  });

  ensure(50);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Orçamento / Custos', margin, y);
  y += 7;

  const col1 = margin;
  const col2 = 155;
  doc.setFontSize(10);
  doc.setFillColor(230, 230, 230);
  doc.rect(col1, y - 5, 180, 8, 'F');
  doc.text('Item', col1 + 2, y);
  doc.text('Valor', col2 + 2, y);
  y += 8;

  let total = 0;
  form.custos.filter(c => c.item || c.valor).forEach(c => {
    ensure(8);
    const value = Number(String(c.valor).replace(',', '.')) || 0;
    total += value;
    doc.setFont('helvetica', 'normal');
    doc.text(String(c.item || '-'), col1 + 2, y, { maxWidth: 135 });
    doc.text(brl(value), col2 + 2, y);
    y += 7;
  });

  doc.setFont('helvetica', 'bold');
  doc.rect(col1, y - 5, 180, 8);
  doc.text('TOTAL', col1 + 2, y);
  doc.text(brl(total), col2 + 2, y);
  y += 12;

  if (fotos.length > 0) {
    ensure(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Registro Fotográfico', margin, y);
    y += 8;

    for (const foto of fotos) {
      ensure(72);
      const boxW = 84;
      const boxH = 58;
      const x = margin;
      doc.setDrawColor(220);
      doc.rect(x, y, boxW, boxH + 10);
      await fitImage(doc, foto.dataUrl, x, y, boxW, boxH);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(70);
      doc.text(foto.legenda || 'Sem legenda', x + 3, y + boxH + 7, { maxWidth: boxW - 6 });
      doc.setTextColor(0);
      y += boxH + 18;
    }
  }

  addFooter(doc, form.observacaoFinal || 'Relatório elaborado de forma técnica e profissional para registro dos serviços executados.');
  doc.save(`relatorio-servico-${numero.replace('/', '-')}.pdf`);
}

function App() {
  const [form, setForm] = useState(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    return draft ? JSON.parse(draft).form : emptyForm;
  });
  const [fotos, setFotos] = useState(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    return draft ? JSON.parse(draft).fotos || [] : [];
  });
  const [status, setStatus] = useState('');
  const numeroPreview = useMemo(() => getNextNumberPreview(), [status]);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, fotos }));
    setStatus('Rascunho salvo neste navegador.');
  };

  const onFotos = async (files) => {
    const list = Array.from(files || []);
    const converted = await Promise.all(list.map(async file => ({
      id: crypto.randomUUID(),
      nome: file.name,
      legenda: '',
      dataUrl: await loadImage(file)
    })));
    setFotos(prev => [...prev, ...converted]);
  };

  const gerar = async () => {
    try {
      setStatus('Gerando PDF...');
      const numero = commitNextNumber();
      await generatePdf(form, fotos, numero);
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, fotos }));
      setStatus(`PDF gerado com sucesso. Número do relatório: ${numero}.`);
    } catch (err) {
      console.error(err);
      setStatus(`Erro ao gerar PDF: ${err?.message || 'verifique as imagens e tente novamente.'}`);
    }
  };

  const limpar = () => {
    setForm(emptyForm);
    setFotos([]);
    localStorage.removeItem(DRAFT_KEY);
    setStatus('Formulário limpo.');
  };

  const total = form.custos.reduce((acc, c) => acc + (Number(String(c.valor).replace(',', '.')) || 0), 0);

  return <main className="page">
    <section className="hero">
      <div>
        <h1>Gerador de Relatórios de Serviço</h1>
        <p>Versão sem Firebase Storage: gera PDF direto no navegador, sem erro de permissão.</p>
      </div>
      <span className="badge">Próximo nº {numeroPreview}</span>
    </section>

    <section className="card">
      <h2>Dados do relatório</h2>
      <div className="grid two">
        <label>Cliente<input value={form.cliente} onChange={e => update('cliente', e.target.value)} /></label>
        <label>Veículo / Equipamento<input value={form.veiculo} onChange={e => update('veiculo', e.target.value)} /></label>
        <label>Data de recebimento<input type="date" value={form.recebimento} onChange={e => update('recebimento', e.target.value)} /></label>
        <label>Data de entrega<input type="date" value={form.entrega} onChange={e => update('entrega', e.target.value)} /></label>
      </div>
      <label>Problema relatado<textarea value={form.problema} onChange={e => update('problema', e.target.value)} /></label>
      <label>Diagnóstico técnico<textarea value={form.diagnostico} onChange={e => update('diagnostico', e.target.value)} /></label>
    </section>

    <section className="card">
      <div className="section-title"><h2>Serviços realizados</h2><button onClick={() => update('servicos', [...form.servicos, ''])}><Plus size={18}/> Adicionar</button></div>
      {form.servicos.map((s, idx) => <div className="row" key={idx}>
        <input value={s} onChange={e => {
          const copy = [...form.servicos]; copy[idx] = e.target.value; update('servicos', copy);
        }} placeholder="Ex.: Substituição do kit de embreagem" />
        <button className="danger" onClick={() => update('servicos', form.servicos.filter((_, i) => i !== idx))}><Trash2 size={18}/></button>
      </div>)}
    </section>

    <section className="card">
      <div className="section-title"><h2>Orçamento / Custos</h2><button onClick={() => update('custos', [...form.custos, { item: '', valor: '' }])}><Plus size={18}/> Adicionar</button></div>
      {form.custos.map((c, idx) => <div className="row costs" key={idx}>
        <input value={c.item} onChange={e => { const copy=[...form.custos]; copy[idx]={...copy[idx], item:e.target.value}; update('custos', copy); }} placeholder="Item" />
        <input value={c.valor} onChange={e => { const copy=[...form.custos]; copy[idx]={...copy[idx], valor:e.target.value}; update('custos', copy); }} placeholder="Valor" />
        <button className="danger" onClick={() => update('custos', form.custos.filter((_, i) => i !== idx))}><Trash2 size={18}/></button>
      </div>)}
      <strong>Total: {brl(total)}</strong>
    </section>

    <section className="card">
      <h2>Registro fotográfico</h2>
      <label className="upload"><ImagePlus size={20}/> Adicionar fotos<input type="file" multiple accept="image/*" onChange={e => onFotos(e.target.files)} /></label>
      <div className="photos">
        {fotos.map((foto, idx) => <div className="photo" key={foto.id}>
          <img src={foto.dataUrl} alt={foto.nome} />
          <input value={foto.legenda} onChange={e => setFotos(prev => prev.map((f, i) => i === idx ? { ...f, legenda: e.target.value } : f))} placeholder="Legenda da foto" />
          <button className="danger" onClick={() => setFotos(prev => prev.filter((_, i) => i !== idx))}><Trash2 size={16}/> Remover</button>
        </div>)}
      </div>
    </section>

    <section className="card">
      <label>Texto final<textarea value={form.observacaoFinal} onChange={e => update('observacaoFinal', e.target.value)} /></label>
      <div className="actions">
        <button className="primary" onClick={gerar}><FileDown size={20}/> Gerar PDF</button>
        <button onClick={saveDraft}>Salvar rascunho</button>
        <button onClick={limpar}><RotateCcw size={18}/> Limpar</button>
      </div>
      {status && <p className="status">{status}</p>}
    </section>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
