# App de Relatórios de Serviço

## O que esta versão corrige

- Corrige o corte das fotos entre páginas no PDF.
- Gera PDF com `jsPDF`, sem depender de captura HTML quebrando páginas.
- Salva o relatório no Firestore.
- Salva as fotos no Firebase Storage.
- Gera numeração automática no formato `001/2026`.
- Permite legenda individual nas fotos.
- Se o Firebase falhar, o app mostra erro mais claro no console do navegador.

---

## 1. Substituir arquivos no GitHub

No seu projeto atual, substitua/adiciona estes arquivos:

```txt
package.json
index.html
.env.example
firestore.rules
storage.rules
src/main.jsx
src/App.jsx
src/firebase.js
src/pdfGenerator.js
src/styles.css
```

Depois envie para o GitHub.

---

## 2. Configurar Firebase no projeto

No Firebase Console:

1. Entre no seu projeto.
2. Vá em **Configurações do projeto**.
3. Role até **Seus apps**.
4. Clique no app Web `</>`.
5. Copie o objeto `firebaseConfig`.

Agora crie um arquivo `.env` na raiz do projeto com este modelo:

```env
VITE_FIREBASE_API_KEY=SUA_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=SEU_PROJETO.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=SEU_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=SEU_PROJETO.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=SEU_SENDER_ID
VITE_FIREBASE_APP_ID=SEU_APP_ID
```

Importante: no campo `VITE_FIREBASE_STORAGE_BUCKET`, use exatamente o bucket informado pelo Firebase.
Pode ser `.appspot.com` ou `.firebasestorage.app`, dependendo do projeto.

---

## 3. Ativar Firestore

No Firebase:

1. Vá em **Firestore Database**.
2. Clique em **Criar banco de dados**.
3. Escolha **modo de teste** para começar.
4. Escolha a região.
5. Conclua.

Depois vá em **Regras** e cole o conteúdo do arquivo `firestore.rules`.
Publique.

---

## 4. Ativar Storage

No Firebase:

1. Vá em **Storage**.
2. Clique em **Começar**.
3. Escolha **modo de teste**.
4. Conclua.

Depois vá em **Regras** e cole o conteúdo do arquivo `storage.rules`.
Publique.

---

## 5. Rodar localmente

No terminal, dentro da pasta do projeto:

```bash
npm install
npm run dev
```

Abra o link que aparecer, normalmente:

```txt
http://localhost:5173
```

---

## 6. Publicar na Vercel

1. Entre em https://vercel.com
2. Importe o repositório do GitHub.
3. Em **Environment Variables**, cadastre as mesmas variáveis do `.env`:

```txt
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

4. Clique em **Deploy**.

---

## 7. Se aparecer erro ao salvar

Abra o navegador e pressione `F12` → aba **Console**.
Os erros mais comuns são:

- Firestore não ativado.
- Storage não ativado.
- Regras bloqueando escrita.
- Variáveis `VITE_FIREBASE_*` faltando na Vercel.
- Bucket do Storage escrito errado.

