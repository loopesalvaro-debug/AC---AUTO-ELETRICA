# Gerador de Relatórios de Serviço - AC Auto Elétrica

## Versão 6 - sem Firebase Storage

Esta versão foi alterada para funcionar **sem Firebase Storage**, porque o Storage pediu upgrade do projeto.

Agora o app usa apenas:

- React/Vite;
- Firebase Firestore;
- GitHub;
- Vercel;
- jsPDF para gerar o PDF com fotos e legendas.

As fotos entram diretamente no PDF no navegador. Elas **não são enviadas para o Firebase Storage**.

## O que foi corrigido

- Removido todo uso de Firebase Storage;
- Removidos imports de `getStorage`, `ref`, `uploadString` e `getDownloadURL`;
- PDF continua gerando fotos com legenda;
- Numeração automática continua como `001/2026`;
- Firestore salva os dados do relatório e as legendas das fotos;
- O app não precisa mais de upgrade pago para anexar fotos ao PDF.

## Arquivos principais

- `src/firebase.js` — configuração do Firebase;
- `src/main.jsx` — tela do sistema e salvamento no Firestore;
- `src/lib/pdf.js` — geração do PDF;
- `src/style.css` — layout;
- `firestore.rules` — regras para liberar o Firestore em teste;
- `storage.rules` — apenas aviso, não precisa usar.

## Como subir no GitHub

1. Baixe e extraia o ZIP.
2. Apague os arquivos antigos do seu repositório, ou substitua todos por estes arquivos novos.
3. Envie tudo para o GitHub.
4. Aguarde a Vercel fazer o deploy automaticamente.

## Configuração do Firestore

No Firebase Console, abra o projeto `AC - Auto Eletrica`.

Vá em:

```txt
Firestore Database > Regras
```

Apague tudo e cole:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /relatorios/{document=**} {
      allow read, write: if true;
    }

    match /contadores/{document=**} {
      allow read, write: if true;
    }
  }
}
```

Clique em **Publicar**.

## Não precisa ativar Storage

Nesta versão, não clique em upgrade do Storage.

O app não usa Storage.

## Teste local opcional

```bash
npm install
npm run dev
```

## Teste na Vercel

Depois do deploy:

1. Abra o link da Vercel;
2. Preencha cliente e veículo;
3. Adicione itens;
4. Adicione fotos e legendas;
5. Clique em **Salvar e gerar PDF**.

Se aparecer erro de permissão, confira somente as regras do Firestore.
