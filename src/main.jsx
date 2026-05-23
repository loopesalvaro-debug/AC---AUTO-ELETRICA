import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { addDoc, collection, doc, getDoc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { FileText, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { db, storage, FIREBASE_PROJECT_ID } from "./firebase";
import { generateReportPDF, money, readFileAsDataURL } from "./lib/pdf";
import "./style.css";

const emptyReport = {
  cliente: "",
  veiculo: "",
  dataRecebimento: "",
  dataEntrega: "",
  problema: "",
  diagnostico: "",
  servicos: "",
  itens: [
    { descricao: "", valor: "" }
  ]
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

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function App() {
  const [report, setReport] = useState(emptyReport);
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const total = useMemo(() => {
    return report.itens.reduce((sum, item) => sum + Number(String(item.valor || "0").replace(",", ".")), 0);
  }, [report.itens]);

  function updateReport(field, value) {
    setReport((prev) => ({ ...prev, [field]: value }));
  }

  function updateItem(index, field, value) {
    setReport((prev) => {
      const itens = [...prev.itens];
      itens[index] = { ...itens[index], [field]: value };
      return { ...prev, itens };
    });
  }

  function addItem() {
    setReport((prev) => ({ ...prev, itens: [...prev.itens, { descricao: "", valor: "" }] }));
  }

  function removeItem(index) {
    setReport((prev) => ({ ...prev, itens: prev.itens.filter((_, i) => i !== index) }));
  }

  async function handlePhotos(event) {
    const files = Array.from(event.target.files || []);
    const converted = await Promise.all(files.map(async (file) => ({
      id: `${Date.now()}-${file.name}-${Math.random()}`,
      name: file.name,
      caption: "",
      dataUrl: await readFileAsDataURL(file)
    })));
    setPhotos((prev) => [...prev, ...converted]);
    event.target.value = "";
  }

  function updatePhotoCaption(id, caption) {
    setPhotos((prev) => prev.map((photo) => photo.id === id ? { ...photo, caption } : photo));
  }

  function removePhoto(id) {
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
  }

  function validate() {
    if (!report.cliente.trim()) return "Informe o cliente.";
    if (!report.veiculo.trim()) return "Informe o veículo.";
    if (!report.problema.trim()) return "Informe o problema relatado.";
    if (!report.diagnostico.trim()) return "Informe o diagnóstico técnico.";
    return "";
  }

  async function uploadPhotos(numero) {
    const uploaded = [];
    for (const [index, photo] of photos.entries()) {
      const cleanNumber = numero.replace("/", "-");
      const imageRef = ref(storage, `relatorios/${cleanNumber}/foto-${index + 1}.jpg`);
      await uploadString(imageRef, photo.dataUrl, "data_url");
      const url = await getDownloadURL(imageRef);
      uploaded.push({ url, caption: photo.caption || "", name: photo.name || "" });
    }
    return uploaded;
  }

  async function saveAndGeneratePDF() {
    const validationMessage = validate();
    if (validationMessage) {
      setStatus({ type: "error", message: validationMessage });
      return;
    }

    setLoading(true);
    setStatus({ type: "info", message: "Gerando número automático, salvando no Firebase e criando PDF..." });

    try {
      if (!FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID === "undefined") {
        throw new Error("Firebase sem projectId. Verifique src/firebase.js.");
      }

      const numero = await getNextReportNumber();
      const normalizedItems = report.itens
        .filter((item) => item.descricao.trim() || item.valor)
        .map((item) => ({
          descricao: item.descricao.trim(),
          valor: Number(String(item.valor || "0").replace(",", "."))
        }));

      const reportToSave = {
        ...report,
        numero,
        itens: normalizedItems,
        total: normalizedItems.reduce((sum, item) => sum + Number(item.valor || 0), 0),
        criadoEm: serverTimestamp(),
        projetoFirebase: FIREBASE_PROJECT_ID
      };

      const uploadedPhotos = await uploadPhotos(numero);
      const docRef = await addDoc(collection(db, "relatorios"), {
        ...reportToSave,
        fotos: uploadedPhotos
      });

      await generateReportPDF(reportToSave, photos);
      setStatus({ type: "success", message: `Relatório ${numero} salvo no Firebase e PDF gerado com sucesso.` });
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message: `Erro: ${error.code || "sem-codigo"} - ${error.message || "Falha ao salvar ou gerar PDF."}`
      });
    } finally {
      setLoading(false);
    }
  }

  async function generateDraftPDF() {
    const draftNumber = `RASCUNHO/${currentYear()}`;
    await generateReportPDF({ ...report, numero: draftNumber }, photos);
    setStatus({ type: "success", message: "Rascunho em PDF gerado sem salvar no Firebase." });
  }

  function clearForm() {
    setReport(emptyReport);
    setPhotos([]);
    setStatus({ type: "", message: "" });
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">AC Auto Elétrica</p>
          <h1>Gerador de Relatórios de Serviço</h1>
          <p>Preencha o serviço, adicione fotos com legenda, salve no Firebase e gere o PDF automaticamente.</p>
        </div>
        <div className="badge"><FileText size={18} /> Nº automático 001/{currentYear()}</div>
      </section>

      <section className="card">
        <h2>Dados do relatório</h2>
        <div className="grid two">
          <Field label="Cliente">
            <input value={report.cliente} onChange={(e) => updateReport("cliente", e.target.value)} placeholder="Nome do cliente" />
          </Field>
          <Field label="Veículo">
            <input value={report.veiculo} onChange={(e) => updateReport("veiculo", e.target.value)} placeholder="Ex.: Fiat Argo" />
          </Field>
          <Field label="Data de recebimento">
            <input type="date" value={report.dataRecebimento} onChange={(e) => updateReport("dataRecebimento", e.target.value)} />
          </Field>
          <Field label="Data de entrega">
            <input type="date" value={report.dataEntrega} onChange={(e) => updateReport("dataEntrega", e.target.value)} />
          </Field>
        </div>

        <Field label="Problema relatado pelo cliente">
          <textarea value={report.problema} onChange={(e) => updateReport("problema", e.target.value)} placeholder="Descreva o problema informado pelo cliente" />
        </Field>
        <Field label="Diagnóstico técnico">
          <textarea value={report.diagnostico} onChange={(e) => updateReport("diagnostico", e.target.value)} placeholder="Descreva o diagnóstico encontrado" />
        </Field>
        <Field label="Serviços realizados">
          <textarea value={report.servicos} onChange={(e) => updateReport("servicos", e.target.value)} placeholder="Liste os serviços executados" />
        </Field>
      </section>

      <section className="card">
        <div className="sectionHeader">
          <h2>Orçamento / Custos</h2>
          <button type="button" className="secondary" onClick={addItem}><Plus size={16} /> Adicionar item</button>
        </div>

        <div className="items">
          {report.itens.map((item, index) => (
            <div className="itemRow" key={index}>
              <input value={item.descricao} onChange={(e) => updateItem(index, "descricao", e.target.value)} placeholder="Descrição do item" />
              <input className="money" value={item.valor} onChange={(e) => updateItem(index, "valor", e.target.value)} placeholder="0,00" inputMode="decimal" />
              <button type="button" className="icon danger" onClick={() => removeItem(index)} aria-label="Remover item"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <div className="total">Total: <strong>{money(total)}</strong></div>
      </section>

      <section className="card">
        <div className="sectionHeader">
          <h2>Registro fotográfico</h2>
          <label className="uploadButton"><Upload size={16} /> Adicionar fotos
            <input type="file" accept="image/*" multiple onChange={handlePhotos} hidden />
          </label>
        </div>

        {photos.length === 0 ? (
          <div className="empty">Nenhuma foto adicionada ainda.</div>
        ) : (
          <div className="photoGrid">
            {photos.map((photo) => (
              <div className="photoCard" key={photo.id}>
                <button type="button" className="removePhoto" onClick={() => removePhoto(photo.id)}><X size={16} /></button>
                <img src={photo.dataUrl} alt={photo.caption || "Foto do relatório"} />
                <input value={photo.caption} onChange={(e) => updatePhotoCaption(photo.id, e.target.value)} placeholder="Legenda da foto" />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="actions">
        <button type="button" className="primary" onClick={saveAndGeneratePDF} disabled={loading}>
          <Save size={18} /> {loading ? "Salvando..." : "Salvar e gerar PDF"}
        </button>
        <button type="button" className="secondary" onClick={generateDraftPDF} disabled={loading}>Gerar rascunho</button>
        <button type="button" className="secondary" onClick={clearForm} disabled={loading}>Limpar</button>
      </section>

      {status.message && <div className={`status ${status.type}`}>{status.message}</div>}

      <section className="card help">
        <h2>Importante</h2>
        <p>Este app já está usando o projeto Firebase: <strong>{FIREBASE_PROJECT_ID}</strong>.</p>
        <p>Se aparecer erro de permissão, publique as regras dos arquivos <code>firestore.rules</code> e <code>storage.rules</code> no Firebase Console.</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
