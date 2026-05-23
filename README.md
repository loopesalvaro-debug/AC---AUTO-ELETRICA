[README.md](https://github.com/user-attachments/files/28179764/README.md)
# AC---AUTO-ELETRICA# Gerador de Relatórios de Serviço

Aplicativo React/Vite para preencher relatórios de serviço, salvar no Firebase e gerar PDF com numeração automática no padrão `001/2026`.

## 1. O que o app faz

- Cadastro de cliente, veículo/equipamento, datas, problema, diagnóstico, serviços e custos.
- Upload de fotos do serviço.
- Numeração automática anual, exemplo: `001/2026`, `002/2026`, `003/2026`.
- Salvamento no Firestore.
- Upload das fotos no Firebase Storage.
- Geração de PDF após clicar em **Salvar e gerar PDF**.
- Deploy na Vercel usando GitHub.

---

## 2. Criar projeto no Firebase

1. Acesse o Firebase Console.
2. Clique em **Add project / Adicionar projeto**.
3. Crie o projeto, exemplo: `relatorios-servico-vm`.
4. Dentro do projeto, clique em **Web app** `</>`.
5. Copie as configurações do Firebase.
6. Ative o **Cloud Firestore**.
7. Ative o **Storage**.

---

## 3. Configurar o arquivo .env

Na raiz do projeto, copie o arquivo:

```bash
.env.example
```

Renomeie para:

```bash
.env
```

Cole seus dados reais do Firebase:

```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:xxxxxxxxxxxx
```

---

## 4. Regras iniciais do Firestore

Para teste inicial, use regras abertas temporárias:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

Atenção: isso é apenas para teste. Para produção, use login e regras protegidas.

---

## 5. Regras iniciais do Storage

Para teste inicial:

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

Atenção: isso é apenas para teste.

---

## 6. Rodar no computador

Instale o Node.js.

Depois, na pasta do projeto:

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal, geralmente:

```bash
http://localhost:5173
```

---

## 7. Como gerar o PDF

1. Preencha o relatório.
2. Anexe as fotos.
3. Clique em **Salvar e gerar PDF**.
4. O sistema:
   - gera o próximo número do ano;
   - salva no Firestore;
   - envia as fotos para o Storage;
   - baixa o PDF no navegador.

Exemplo de arquivo gerado:

```bash
Relatorio-001-2026.pdf
```

---

## 8. Subir para o GitHub

Na pasta do projeto:

```bash
git init
git add .
git commit -m "primeira versao do app de relatorios"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/relatorios-servico-app.git
git push -u origin main
```

---

## 9. Publicar na Vercel

1. Acesse a Vercel.
2. Clique em **Add New Project**.
3. Escolha o repositório do GitHub.
4. Framework: **Vite**.
5. Build command: `npm run build`.
6. Output directory: `dist`.
7. Em **Environment Variables**, adicione todas as variáveis do arquivo `.env`.
8. Clique em **Deploy**.

---

## 10. Melhorias recomendadas para produção

- Criar login com Firebase Authentication.
- Restringir Firestore e Storage para usuários autenticados.
- Criar tela de lista de relatórios salvos.
- Criar busca por cliente, veículo e número do relatório.
- Adicionar logo da empresa no PDF.
- Criar assinatura digital do cliente.
- Botão de envio por WhatsApp.
