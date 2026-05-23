# Gerador de Relatórios - AC Auto Elétrica

Esta é a versão V7 antierro.

Ela foi feita para resolver o problema de Firebase Storage pedindo upgrade e erros travando o PDF.

## O que mudou nesta versão

- NÃO usa Firebase Storage.
- NÃO usa variáveis de ambiente da Vercel.
- Firebase está configurado direto em `src/firebase.js`.
- O PDF é gerado no navegador, mesmo que o Firebase falhe.
- As fotos entram diretamente no PDF.
- As legendas aparecem abaixo das fotos.
- A numeração automática tenta usar o Firestore.
- Se o Firestore falhar, o app usa numeração local no navegador e mesmo assim gera o PDF.

## Como subir no GitHub

1. Baixe e extraia este ZIP.
2. No GitHub, abra o repositório do app.
3. Apague os arquivos antigos, principalmente a pasta `src` antiga.
4. Envie TODOS os arquivos desta pasta.
5. Faça commit.
6. Aguarde a Vercel fazer deploy.

## Muito importante

Se a Vercel parecer não atualizar:

1. Entre na Vercel.
2. Abra o projeto.
3. Vá em Deployments.
4. Clique nos três pontinhos do último deploy.
5. Clique em Redeploy.
6. Se aparecer opção, marque para não usar cache.

## Regras do Firestore

No Firebase Console:

Firestore Database → Regras

Cole:

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

Clique em Publicar.

## Storage

Não ative Storage.
Não pague upgrade.
Esta versão não usa Storage.

## Teste rápido

1. Abra o app.
2. Preencha cliente, veículo e pelo menos uma foto.
3. Clique em Salvar e gerar PDF.
4. O PDF deve baixar mesmo que o Firebase esteja com erro.

