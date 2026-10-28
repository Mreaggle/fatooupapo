# Fato ou Papo

Plataforma de fact-checking de debates políticos em vídeos do YouTube. A interface valida o link, procura uma análise já revisada no acervo de snapshots e, quando necessário, encaminha o vídeo a um backend configurado para transcrição, pesquisa de evidências e elaboração do relatório.

## Desenvolvimento

Requer Node.js 22 ou superior.

```bash
npm install
npm run dev
```

Comandos principais:

- `npm test` — executa os testes de URL e estados essenciais.
- `npm run lint` — verifica TypeScript e React com ESLint.
- `npm run build` — valida snapshots, compila e gera `dist/`.
- `npm run preview` — serve localmente o build de produção.

## Integrações

Copie `.env.example` para `.env.local` e defina `VITE_ANALYSIS_API_URL` com a URL do backend. Essa variável é pública; credenciais do YouTube, IA e busca devem permanecer no servidor. Sem backend, a aplicação continua consultando `snapshots/` e informa claramente quando um vídeo ainda não foi analisado.

O contrato esperado está em [docs/API.md](docs/API.md). O formato do acervo está em [snapshots/README.md](snapshots/README.md).

## Publicação

O workflow `.github/workflows/deploy-pages.yml` testa e publica `dist/` no GitHub Pages a cada push para `main`.
