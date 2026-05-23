import { collection, doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';

function formatNumero(numero, ano) {
  return `${String(numero).padStart(3, '0')}/${ano}`;
}

export async function gerarNumeroRelatorio() {
  const ano = new Date().getFullYear();
  const contadorRef = doc(db, 'contadores', String(ano));

  const numero = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(contadorRef);
    const atual = snap.exists() ? snap.data().ultimoNumero || 0 : 0;
    const proximo = atual + 1;
    transaction.set(contadorRef, { ultimoNumero: proximo, ano, atualizadoEm: serverTimestamp() }, { merge: true });
    return proximo;
  });

  return { numero, ano, codigo: formatNumero(numero, ano) };
}

export async function uploadFotos(fotos, codigo) {
  const urls = [];
  for (const [index, foto] of fotos.entries()) {
    const extensao = foto.name.split('.').pop() || 'jpg';
    const caminho = `relatorios/${codigo.replace('/', '-')}/foto-${index + 1}.${extensao}`;
    const arquivoRef = ref(storage, caminho);
    await uploadBytes(arquivoRef, foto);
    const url = await getDownloadURL(arquivoRef);
    urls.push({ nome: foto.name, url, caminho });
  }
  return urls;
}

export async function salvarRelatorio(dados, fotos = []) {
  const identificacao = dados.codigo ? {
    codigo: dados.codigo,
    ano: Number(dados.codigo.split('/')[1]),
    numero: Number(dados.codigo.split('/')[0]),
  } : await gerarNumeroRelatorio();

  const fotosUpload = fotos.length ? await uploadFotos(fotos, identificacao.codigo) : [];
  const relatorioRef = doc(collection(db, 'relatorios'));

  const payload = {
    ...dados,
    ...identificacao,
    fotos: fotosUpload,
    total: dados.itens.reduce((soma, item) => soma + (Number(item.valor) || 0), 0),
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };

  await setDoc(relatorioRef, payload);
  return { id: relatorioRef.id, ...payload };
}
