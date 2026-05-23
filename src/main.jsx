import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { addDoc, collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { FileText, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { db, FIREBASE_PROJECT_ID } from "./firebase";
import { generateReportPDF, money, parseMoney, readFileAsDataURL } from "./lib/pdf";
import "./style.css";

const emptyReport = {
  cliente: "",
  veiculo: "",
  dataRecebimento: "",
  dataEntrega: "",
  problema: "",
  diagnostico: "",
  servicos: "",
  itens: [{ descricao: "", valor: "" }]
};

function currentYear() {
  return new Date().getFullYear();
}

function padNumber(num) {
  return String(num).padStart(3, "0");
}

async function getNextReportNumber() {
  const year = currentYear();
  const counterRef = doc(db, "contadores", String(year));

  const nextNumber = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const atual = snap.exists() ? Number(snap.data().ultimo || 0) : 0;
    const proximo = atual + 1;
    transaction.set(counterRef, { ultimo: proximo, ano: year, atualizadoEm: serverTimestamp() }, { merge: true });
    return proximo;
  });

  return `${padNumber(nextNumber)}/${year}`;
}

function App() {
  const [report, setReport] = useState(emptyReport);
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const total = report.itens.reduce((sum, item) => sum + parseMoney(item.valor), 0);

  function updateField(field, value) {
    setReport((old) => ({ ...old, [field]: value }));
  }

  function updateItem(index, field, value) {
    setReport((old) => {
      const itens = [...old.itens];
      itens[index] = { ...itens[index], [field]: value };
      return { ...old, itens };
    });
  }

  function addItem() {
    setReport((old) => ({ ...old, itens: [...old.itens, { descricao: "", valor: "" }] }));
  }

  function removeItem(index) {
    setReport((old) => ({ ...old, itens: old.itens.filter((_, i) => i !== index) }));
  }

  async function handleFotos(files) {
    const selected = Array.from(files || []);
    if (!selected.length) return;

    const novasFotos = [];
    for (const file of selected) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await readFileAsDataURL(file);
      novasFotos.push({
        id: crypto.randomUUID(),
        nome: file.name,
        dataUrl,
        legenda: ""
      });
    }
    setFotos((old) => [...old, ...novasFotos]);
  }

  function updateLegenda(id, legenda) {
    setFotos((old) => old.map((foto) => foto.id === id ? { ...foto, legenda } : foto));
  }

  function removeFoto(id) {
    setFotos((old) => old.filter((foto) => foto.id !== id));
  }

  function validate() {
    if (!report.cliente.trim()) return "Preencha o nome do cliente.";
    if (!report.veiculo.trim()) return "Preencha o veículo.";
    return "";
  }

  async function salvarEGerarPDF() {
    const error = validate();
    if (error) {
      setMsg(error);
      return;
    }

    setLoading(true);
    setMsg("");
    try {
      const numeroRelatorio = await getNextReportNumber();
      const payload = {
        ...report,
        numeroRelatorio,
        total,
        fotos: fotos.map((foto) => ({ nome: foto.nome, legenda: foto.legenda })),
        criadoEm: serverTimestamp(),
        projetoFirebase: FIREBASE_PROJECT_ID,
        observacao: "Fotos não são salvas no Firebase Storage nesta versão. Elas entram diretamente no PDF gerado."
      };

      await addDoc(collection(db, "relatorios"), payload);
      await generateReportPDF({ report, fotos, numeroRelatorio, draft: false });
      setMsg(`Relatório ${numeroRelatorio} salvo no Firestore e PDF gerado com sucesso.`);
    } catch (error) {
      console.error(error);
      setMsg(`Erro: ${error?.code || "falha"} - ${error?.message || "não foi possível salvar/gerar o PDF"}`);
    } finally {
      setLoading(false);
    }
  }

  async function gerarRascunho() {
    const numeroRelatorio = `RASCUNHO-${currentYear()}`;
    await generateReportPDF({ report, fotos, numeroRelatorio, draft: true });
  }

  function limpar() {
    setReport(emptyReport);
    setFotos([]);
    setMsg("");
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">AC Auto Elétrica</p>
          <h1>Gerador de Relatórios de Serviço</h1>
          <p>Preencha o relatório, adicione fotos com legenda, salve no Firestore e gere o PDF final.</p>
          <p className="small">Versão sem Firebase Storage: não precisa fazer upgrade pago para anexar fotos ao PDF.</p>
        </div>
        <div className="badge"><FileText size={20} /> PDF + Firestore</div>
      </section>

      <section className="card">
        <h2>Dados principais</h2>
        <div className="grid two">
          <label>Cliente<input value={report.cliente} onChange={(e) => updateField("cliente", e.target.value)} placeholder="Ex.: Arachelle" /></label>
          <label>Veículo<input value={report.veiculo} onChange={(e) => updateField("veiculo", e.target.value)} placeholder="Ex.: Fiat Argo" /></label>
          <label>Data de recebimento<input type="date" value={report.dataRecebimento} onChange={(e) => updateField("dataRecebimento", e.target.value)} /></label>
          <label>Data de entrega<input type="date" value={report.dataEntrega} onChange={(e) => updateField("dataEntrega", e.target.value)} /></label>
        </div>

        <label>Problema relatado pelo cliente<textarea value={report.problema} onChange={(e) => updateField("problema", e.target.value)} placeholder="Descreva o problema informado pelo cliente." /></label>
        <label>Diagnóstico técnico<textarea value={report.diagnostico} onChange={(e) => updateField("diagnostico", e.target.value)} placeholder="Descreva o diagnóstico realizado." /></label>
        <label>Serviços realizados<textarea value={report.servicos} onChange={(e) => updateField("servicos", e.target.value)} placeholder="Liste os serviços executados." /></label>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Orçamento / Custos</h2>
          <button type="button" className="secondary" onClick={addItem}><Plus size={16} /> Adicionar item</button>
        </div>
        <div className="items">
          {report.itens.map((item, index) => (
            <div className="item-row" key={index}>
              <input value={item.descricao} onChange={(e) => updateItem(index, "descricao", e.target.value)} placeholder="Descrição do item ou serviço" />
              <input value={item.valor} onChange={(e) => updateItem(index, "valor", e.target.value)} placeholder="Valor" inputMode="decimal" />
              <button type="button" className="icon danger" onClick={() => removeItem(index)} disabled={report.itens.length === 1}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <div className="total">TOTAL: R$ {money(total)}</div>
      </section>

      <section className="card">
        <h2>Registro Fotográfico</h2>
        <label className="upload-box">
          <Upload size={24} />
          <span>Clique para selecionar fotos</span>
          <input type="file" multiple accept="image/*" onChange={(e) => handleFotos(e.target.files)} />
        </label>

        {fotos.length > 0 && (
          <div className="photos-grid">
            {fotos.map((foto) => (
              <div className="photo-card" key={foto.id}>
                <button type="button" className="remove-photo" onClick={() => removeFoto(foto.id)}><X size={16} /></button>
                <img src={foto.dataUrl} alt={foto.nome} />
                <input value={foto.legenda} onChange={(e) => updateLegenda(foto.id, e.target.value)} placeholder="Legenda da foto" />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="actions card">
        <button type="button" className="primary" onClick={salvarEGerarPDF} disabled={loading}><Save size={18} /> {loading ? "Salvando..." : "Salvar e gerar PDF"}</button>
        <button type="button" className="secondary" onClick={gerarRascunho}><FileText size={18} /> Gerar rascunho</button>
        <button type="button" className="secondary" onClick={limpar}>Limpar</button>
        {msg && <div className={msg.startsWith("Erro") ? "message error" : "message success"}>{msg}</div>}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
