# Gerador de Relatórios de Serviço - AC Auto Elétrica

Aplicativo React/Vite com Firebase para gerar relatórios de serviço com:

- Numeração automática, exemplo `001/2026`;
- Cadastro de cliente, veículo, problema, diagnóstico e serviços;
- Orçamento com total automático;
- Upload de fotos com legenda individual;
- Salvamento no Firebase Firestore;
- Upload das fotos no Firebase Storage;
- Geração automática de PDF pelo botão **Salvar e gerar PDF**.

## 1. Subir no GitHub

1. Extraia este ZIP.
2. Abra a pasta do projeto.
3. Envie todos os arquivos para um repositório no GitHub.

## 2. Configurar o Firebase

O arquivo `src/firebase.js` já está com os dados enviados:

```js
projectId: "ac---auto-eletrica"
storageBucket: "ac---auto-eletrica.firebasestorage.app"
```

## 3. Ativar Firestore

1. Entre no Firebase Console.
2. Abra o projeto `ac---auto-eletrica`.
3. Vá em **Firestore Database**.
4. Clique em **Criar banco de dados**.
5. Escolha **Modo de teste**.
6. Escolha a região e finalize.

## 4. Ativar Storage

1. No Firebase Console, vá em **Storage**.
2. Clique em **Começar**.
3. Escolha **Modo de teste**.
4. Finalize.

## 5. Publicar as regras de teste

### Firestore

No Firebase Console:

1. Vá em **Firestore Database**.
2. Clique em **Regras**.
3. Cole o conteúdo do arquivo `firestore.rules`.
4. Clique em **Publicar**.

### Storage

No Firebase Console:

1. Vá em **Storage**.
2. Clique em **Regras**.
3. Cole o conteúdo do arquivo `storage.rules`.
4. Clique em **Publicar**.

> Atenção: as regras deste projeto estão abertas para facilitar o teste inicial. Para produção, o ideal é adicionar login e regras por usuário.

## 6. Rodar localmente

Instale o Node.js e rode:

```bash
npm install
npm run dev
```

Acesse o link que aparecer no terminal.

## 7. Publicar na Vercel

1. Entre na Vercel.
2. Clique em **Add New Project**.
3. Escolha o repositório do GitHub.
4. Framework: **Vite**.
5. Build Command: `npm run build`.
6. Output Directory: `dist`.
7. Clique em **Deploy**.

## 8. Como usar

1. Preencha os dados do relatório.
2. Adicione itens do orçamento.
3. Adicione fotos e escreva uma legenda para cada uma.
4. Clique em **Salvar e gerar PDF**.
5. O sistema cria um número automático, salva no Firebase e baixa o PDF.

## 9. Erros comuns

### `permission-denied`

Geralmente é regra do Firestore ou Storage. Publique novamente os arquivos:

- `firestore.rules`
- `storage.rules`

### `projects/undefined`

Este projeto já está corrigido com Firebase fixo em `src/firebase.js`. Se esse erro aparecer, confira se o GitHub recebeu o arquivo atualizado.

### Storage não inicia

Confirme se o Firebase Storage foi ativado no Console.
