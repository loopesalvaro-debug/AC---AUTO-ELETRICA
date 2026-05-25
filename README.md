# Gerador de Relatórios de Serviço - versão v8 sem Firebase

Esta versão foi feita para eliminar definitivamente o erro:

`Permission denied: Consumer projects/undefined has been suspended`

O app NÃO chama Firebase, Firestore nem Storage. Portanto, não existe mais `projects/undefined`.

## O que faz

- Gera PDF direto no navegador.
- Mantém numeração automática no formato 001/2026 usando o navegador.
- Permite fotos com legenda.
- Salva rascunho no navegador.
- Funciona na Vercel sem configurar Firebase.

## Como subir no GitHub

1. Apague todos os arquivos antigos do repositório.
2. Envie todos os arquivos desta pasta.
3. Faça commit.
4. Na Vercel, vá em Deployments e clique em Redeploy.
5. Use a opção de limpar cache se aparecer.

## Importante

Se depois de subir esta versão o console ainda mostrar erro de Firebase, a Vercel está usando build antigo ou você subiu os arquivos na pasta errada.

A tela correta desta versão mostra o texto:

`Versão sem Firebase Storage: gera PDF direto no navegador, sem erro de permissão.`
