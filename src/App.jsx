import React, { useMemo, useState } from "react";
import { Save, FileDown, Trash2, Plus, ImagePlus } from "lucide-react";
import { db, storage } from "./firebase";
import { doc, runTransaction, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { gerarPDF } from "./pdfGenerator";

const anoAtual = new Date().getFullYear();

const vazio = {
  cliente: "",
  veiculo: "",
  dataRecebimento: "",
  dataEntrega: "",
  problema: "",
  diagnostico: "",
  servicos: "",
  itens: [{ nome: "", valor: "" }],
};

async function gerarNumeroRelatorio() {
  const counterRef = doc(db, "counters", String(anoAtual));
  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const atual = snap.exists() ? snap.data().ultimoNumero || 0 : 0;
    const proximo = atual + 1;
    transaction.set(counterRef, { ultimoNumero: proximo, ano: anoAtual }, { merge: true });
    return `${String(proximo).padStart(3, "0")}/${anoAtual}`;
  });
}

export default function App() {
  const [form, setForm] = useState(vazio);
  const [fotos, setFotos] = useState([]);
  const [status, setStatus] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const total = useMemo(() => {
    return form.itens.reduce((acc, item) => acc + Number(String(item.valor).replace(",", ".") || 0), 0);
  }, [form.itens]);

  function alterar(campo, valor) {
    setForm((old) => ({ ...old, [campo]: valor }));
  }

  function alterarItem(index, campo, valor) {
    const itens = [...form.itens];
    itens[index] = { ...itens[index], [campo]: valor };
    setForm((old) => ({ ...old, itens }));
  }

  function adicionarItem() {
    setForm((old) => ({ ...old, itens: [...old.itens, { nome: "", valor: "" }] }));
  }

  function removerItem(index) {
    setForm((old) => ({ ...old, itens: old.itens.filter((_, i) => i !== index) }));
  }

  function selecionarFotos(e) {
    const arquivos = Array.from(e.target.files || []);
    const novas = arquivos.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      legenda: "",
    }));
    setFotos((old) => [...old, ...novas]);
  }

  function alterarLegenda(id, legenda) {
    setFotos((old) => old.map((foto) => (foto.id === id ? { ...foto, legenda } : foto)));
  }

  function removerFoto(id) {
    setFotos((old) => old.filter((foto) => foto.id !== id));
  }

  async function salvarEGerarPDF() {
    setSalvando(true);
    setErro("");
    setStatus("Gerando número do relatório...");
    try {
      const numero = await gerarNumeroRelatorio();
      const relatorio = { ...form, total, numero };

      setStatus("Gerando PDF...");
      await gerarPDF(relatorio, fotos, true);

      setStatus("Enviando fotos para o Firebase...");
      const fotosSalvas = [];
      for (const foto of fotos) {
        const caminho = `relatorios/${anoAtual}/${numero.replace("/", "-")}/${foto.id}-${foto.file.name}`;
        const storageRef = ref(storage, caminho);
        await uploadBytes(storageRef, foto.file);
        const url = await getDownloadURL(storageRef);
        fotosSalvas.push({ url, legenda: foto.legenda, nome: foto.file.name, caminho });
      }

      setStatus("Salvando relatório no Firestore...");
      await addDoc(collection(db, "relatorios"), {
        ...relatorio,
        fotos: fotosSalvas,
        criadoEm: serverTimestamp(),
      });

      setStatus(`Relatório ${numero} salvo e PDF gerado com sucesso.`);
    } catch (error) {
      console.error("Erro completo ao salvar/gerar PDF:", error);
      setErro(`Erro: ${error.code || "sem-codigo"} - ${error.message || error}`);
      setStatus("");
    } finally {
      setSalvando(false);
    }
  }

  async function gerarRascunho() {
    setErro("");
    try {
      await gerarPDF({ ...form, total, numero: `RASCUNHO/${anoAtual}` }, fotos, true);
    } catch (error) {
      console.error(error);
      setErro(`Erro ao gerar rascunho: ${error.message || error}`);
    }
  }

  function limpar() {
    setForm(vazio);
    setFotos([]);
    setStatus("");
    setErro("");
  }

  return (
    <main className="page">
      <section className="card">
        <div className="topbar">
          <div>
            <h1>Relatórios de Serviço</h1>
            <p>Gere relatórios técnicos com fotos, legendas, orçamento e PDF.</p>
          </div>
          <span className="badge">Numeração automática: 001/{anoAtual}</span>
        </div>

        <div className="grid two">
          <label>Cliente<input value={form.cliente} onChange={(e) => alterar("cliente", e.target.value)} /></label>
          <label>Veículo<input value={form.veiculo} onChange={(e) => alterar("veiculo", e.target.value)} /></label>
          <label>Data de recebimento<input type="date" value={form.dataRecebimento} onChange={(e) => alterar("dataRecebimento", e.target.value)} /></label>
          <label>Data de entrega<input type="date" value={form.dataEntrega} onChange={(e) => alterar("dataEntrega", e.target.value)} /></label>
        </div>

        <label>Problema relatado pelo cliente<textarea value={form.problema} onChange={(e) => alterar("problema", e.target.value)} /></label>
        <label>Diagnóstico técnico<textarea value={form.diagnostico} onChange={(e) => alterar("diagnostico", e.target.value)} /></label>
        <label>Serviços realizados<textarea placeholder="Digite um serviço por linha" value={form.servicos} onChange={(e) => alterar("servicos", e.target.value)} /></label>

        <h2>Orçamento / Custos</h2>
        <div className="itens">
          {form.itens.map((item, index) => (
            <div className="item" key={index}>
              <input placeholder="Item" value={item.nome} onChange={(e) => alterarItem(index, "nome", e.target.value)} />
              <input placeholder="Valor" type="number" step="0.01" value={item.valor} onChange={(e) => alterarItem(index, "valor", e.target.value)} />
              <button className="icon" onClick={() => removerItem(index)} type="button"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
        <button className="secondary" onClick={adicionarItem} type="button"><Plus size={18} /> Adicionar item</button>
        <div className="total">Total: R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>

        <h2>Registro Fotográfico</h2>
        <label className="upload"><ImagePlus size={20} /> Adicionar fotos<input type="file" accept="image/*" multiple onChange={selecionarFotos} /></label>
        <div className="fotos">
          {fotos.map((foto) => (
            <div className="foto" key={foto.id}>
              <img src={foto.preview} alt="Prévia" />
              <input placeholder="Legenda da foto" value={foto.legenda} onChange={(e) => alterarLegenda(foto.id, e.target.value)} />
              <button className="danger" type="button" onClick={() => removerFoto(foto.id)}>Remover</button>
            </div>
          ))}
        </div>

        <div className="actions">
          <button className="primary" disabled={salvando} onClick={salvarEGerarPDF} type="button"><Save size={19} /> {salvando ? "Processando..." : "Salvar e gerar PDF"}</button>
          <button className="secondary" onClick={gerarRascunho} type="button"><FileDown size={19} /> Gerar rascunho</button>
          <button className="secondary" onClick={limpar} type="button">Limpar</button>
        </div>

        {status && <div className="notice ok">{status}</div>}
        {erro && <div className="notice error">{erro}</div>}
      </section>
    </main>
  );
}
