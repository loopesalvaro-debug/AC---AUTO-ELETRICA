import React from 'react';

export default function ReportPreview({ dados, fotosPreview }) {
  const total = dados.itens.reduce((soma, item) => soma + (Number(item.valor) || 0), 0);

  return (
    <div className="pdf-page" id="relatorio-pdf">
      <div className="pdf-header">
        <div>
          <h1>RELATÓRIO DE SERVIÇO</h1>
          <p>Documento técnico para registro dos serviços executados.</p>
        </div>
        <div className="pdf-number">Nº {dados.codigo || 'gerado ao salvar'}</div>
      </div>

      <section className="pdf-grid">
        <div><strong>Cliente</strong><span>{dados.cliente || '-'}</span></div>
        <div><strong>Veículo / Equipamento</strong><span>{dados.veiculo || '-'}</span></div>
        <div><strong>Data de recebimento</strong><span>{dados.dataRecebimento || '-'}</span></div>
        <div><strong>Data de entrega</strong><span>{dados.dataEntrega || '-'}</span></div>
      </section>

      <section className="pdf-section">
        <h2>Problema Relatado pelo Cliente</h2>
        <p>{dados.problema || '-'}</p>
      </section>

      <section className="pdf-section">
        <h2>Diagnóstico Técnico</h2>
        <p>{dados.diagnostico || '-'}</p>
      </section>

      <section className="pdf-section">
        <h2>Serviços Realizados</h2>
        <ul>
          {dados.servicos.filter(Boolean).map((servico, index) => <li key={index}>{servico}</li>)}
          {!dados.servicos.filter(Boolean).length && <li>-</li>}
        </ul>
      </section>

      <section className="pdf-section">
        <h2>Orçamento / Custos</h2>
        <table>
          <thead><tr><th>Item</th><th>Valor (R$)</th></tr></thead>
          <tbody>
            {dados.itens.map((item, index) => (
              <tr key={index}><td>{item.descricao || '-'}</td><td>{Number(item.valor || 0).toFixed(2).replace('.', ',')}</td></tr>
            ))}
            <tr className="total"><td>TOTAL</td><td>{total.toFixed(2).replace('.', ',')}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="pdf-section photos-section">
        <h2>Registro Fotográfico</h2>
        <div className="photos-grid">
          {fotosPreview.map((foto, index) => (
            <figure className="photo-item" key={index}>
              <img src={foto.url} alt={foto.legenda || `Registro ${index + 1}`} />
              <figcaption>{foto.legenda || `Foto ${index + 1}`}</figcaption>
            </figure>
          ))}
          {!fotosPreview.length && <p>Nenhuma foto anexada.</p>}
        </div>
      </section>

      <footer>Relatório elaborado de forma técnica e profissional para registro dos serviços executados.</footer>
    </div>
  );
}
