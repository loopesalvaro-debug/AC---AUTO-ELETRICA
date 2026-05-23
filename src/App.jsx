import React, { useMemo, useState } from 'react';
import { FileDown, Plus, Trash2, Save } from 'lucide-react';
import ReportPreview from './components/ReportPreview';
import { salvarRelatorio } from './firebase/relatorios';
import { gerarPDF } from './utils/pdf';
import './styles/app.css';

const dadosIniciais = {
  codigo: '',
  cliente: '',
  veiculo: '',
  dataRecebimento: '',
  dataEntrega: '',
  problema: '',
  diagnostico: '',
  servicos: [''],
  itens: [{ descricao: '', valor: '' }],
};

export default function App() {
  const [dados, setDados] = useState(dadosIniciais);
  const [fotos, setFotos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const fotosPreview = useMemo(() => fotos.map((foto) => ({
    url: URL.createObjectURL(foto.file),
    legenda: foto.legenda || '',
    nome: foto.file.name,
  })), [fotos]);

  function alterarCampo(campo, valor) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
  }

  function alterarServico(index, valor) {
    const servicos = [...dados.servicos];
    servicos[index] = valor;
    alterarCampo('servicos', servicos);
  }

  function adicionarServico() {
    alterarCampo('servicos', [...dados.servicos, '']);
  }

  function removerServico(index) {
    alterarCampo('servicos', dados.servicos.filter((_, i) => i !== index));
  }

  function alterarItem(index, campo, valor) {
    const itens = [...dados.itens];
    itens[index] = { ...itens[index], [campo]: valor };
    alterarCampo('itens', itens);
  }

  function adicionarItem() {
    alterarCampo('itens', [...dados.itens, { descricao: '', valor: '' }]);
  }

  function removerItem(index) {
    alterarCampo('itens', dados.itens.filter((_, i) => i !== index));
  }

  function selecionarFotos(arquivos) {
    const novasFotos = Array.from(arquivos || []).map((file) => ({ file, legenda: '' }));
    setFotos(novasFotos);
  }

  function alterarLegendaFoto(index, legenda) {
    setFotos((atuais) => atuais.map((foto, i) => i === index ? { ...foto, legenda } : foto));
  }

  function removerFoto(index) {
    setFotos((atuais) => atuais.filter((_, i) => i !== index));
  }

  async function salvarEGerarPDF() {
    try {
      setSalvando(true);
      setMensagem('Salvando relatório no Firebase...');
      const relatorioSalvo = await salvarRelatorio(dados, fotos);
      const dadosComCodigo = { ...dados, codigo: relatorioSalvo.codigo };
      setDados(dadosComCodigo);
      setMensagem(`Relatório ${relatorioSalvo.codigo} salvo. Gerando PDF...`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await gerarPDF('relatorio-pdf', `Relatorio-${relatorioSalvo.codigo.replace('/', '-')}.pdf`);
      setMensagem(`PDF gerado com sucesso: ${relatorioSalvo.codigo}`);
    } catch (error) {
      console.error(error);
      setMensagem('Erro ao salvar ou gerar PDF. Verifique Firebase, regras e internet.');
    } finally {
      setSalvando(false);
    }
  }

  function limparFormulario() {
    setDados(dadosIniciais);
    setFotos([]);
    setMensagem('');
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>Gerador de Relatórios de Serviço</h1>
          <p>Preencha o formulário, salve no Firebase e gere o PDF automaticamente.</p>
        </div>
      </header>

      <div className="layout">
        <form className="card form" onSubmit={(e) => e.preventDefault()}>
          <h2>Dados do relatório</h2>
          <div className="grid two">
            <label>Cliente<input value={dados.cliente} onChange={(e) => alterarCampo('cliente', e.target.value)} /></label>
            <label>Veículo / Equipamento<input value={dados.veiculo} onChange={(e) => alterarCampo('veiculo', e.target.value)} /></label>
            <label>Data de recebimento<input type="date" value={dados.dataRecebimento} onChange={(e) => alterarCampo('dataRecebimento', e.target.value)} /></label>
            <label>Data de entrega<input type="date" value={dados.dataEntrega} onChange={(e) => alterarCampo('dataEntrega', e.target.value)} /></label>
          </div>

          <label>Problema relatado<textarea value={dados.problema} onChange={(e) => alterarCampo('problema', e.target.value)} /></label>
          <label>Diagnóstico técnico<textarea value={dados.diagnostico} onChange={(e) => alterarCampo('diagnostico', e.target.value)} /></label>

          <div className="section-title"><h3>Serviços realizados</h3><button type="button" onClick={adicionarServico}><Plus size={16} /> Adicionar</button></div>
          {dados.servicos.map((servico, index) => (
            <div className="row" key={index}>
              <input value={servico} onChange={(e) => alterarServico(index, e.target.value)} placeholder="Ex: Substituição do kit de embreagem" />
              <button type="button" className="icon" onClick={() => removerServico(index)}><Trash2 size={16} /></button>
            </div>
          ))}

          <div className="section-title"><h3>Orçamento / Custos</h3><button type="button" onClick={adicionarItem}><Plus size={16} /> Adicionar</button></div>
          {dados.itens.map((item, index) => (
            <div className="row cost" key={index}>
              <input value={item.descricao} onChange={(e) => alterarItem(index, 'descricao', e.target.value)} placeholder="Item" />
              <input type="number" step="0.01" value={item.valor} onChange={(e) => alterarItem(index, 'valor', e.target.value)} placeholder="Valor" />
              <button type="button" className="icon" onClick={() => removerItem(index)}><Trash2 size={16} /></button>
            </div>
          ))}

          <label>Registro fotográfico<input type="file" multiple accept="image/*" onChange={(e) => selecionarFotos(e.target.files)} /></label>

          {fotos.length > 0 && (
            <div className="photo-caption-list">
              <h3>Legendas das fotos</h3>
              {fotos.map((foto, index) => (
                <div className="photo-caption-card" key={`${foto.file.name}-${index}`}>
                  <div className="photo-caption-info">
                    <img src={URL.createObjectURL(foto.file)} alt={`Prévia ${index + 1}`} />
                    <span>Foto {index + 1}: {foto.file.name}</span>
                  </div>
                  <input
                    value={foto.legenda}
                    onChange={(e) => alterarLegendaFoto(index, e.target.value)}
                    placeholder="Legenda da foto. Ex: Platô da embreagem com desgaste"
                  />
                  <button type="button" className="icon" onClick={() => removerFoto(index)}><Trash2 size={16} /> Remover</button>
                </div>
              ))}
            </div>
          )}

          <div className="actions">
            <button type="button" className="primary" disabled={salvando} onClick={salvarEGerarPDF}><Save size={18} /> Salvar e gerar PDF</button>
            <button type="button" onClick={() => gerarPDF('relatorio-pdf', 'Relatorio-rascunho.pdf')}><FileDown size={18} /> Gerar rascunho</button>
            <button type="button" onClick={limparFormulario}>Limpar</button>
          </div>
          {mensagem && <p className="message">{mensagem}</p>}
        </form>

        <aside className="preview-wrap">
          <ReportPreview dados={dados} fotosPreview={fotosPreview} />
        </aside>
      </div>
    </main>
  );
}
