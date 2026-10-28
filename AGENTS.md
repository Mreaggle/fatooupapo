# Repository Guidelines

## Project Structure & Module Organization

The React + TypeScript application lives in `src/`. Keep reusable parsing logic in `src/lib/`, external-service clients in `src/services/`, shared contracts in `src/types.ts`, and UI composition in components or `App.tsx`. Tests sit next to the code they cover, using `*.test.ts` or `*.test.tsx`.

Human-reviewable analysis records belong in `snapshots/*.md`. `scripts/build-snapshot-index.mjs` validates them and generates `public/snapshots/index.json` for the static app. Treat `dist/` as generated output. Architecture and API expectations are documented under `docs/`.

## Build, Test, and Development Commands

- `npm install` — install the locked dependencies.
- `npm run dev` — launch the Vite development server.
- `npm test` — run the Vitest suite once.
- `npm run lint` — check TypeScript and React code with ESLint.
- `npm run build` — validate snapshots, type-check, and create `dist/`.
- `npm run preview` — serve the production build locally.

Use Node.js 22 or newer. GitHub Actions runs tests and builds before deploying to Pages.

## Coding Style & Naming Conventions

Use two-space indentation, single quotes in TypeScript, and trailing commas in multiline structures. Name React components and types in `PascalCase`, functions and variables in `camelCase`, and CSS classes with BEM-style names such as `claim-card__meta`. Keep service boundaries typed and return explicit errors rather than simulated data.

## Testing Guidelines

Vitest, Testing Library, and jsdom cover URL parsing and user-visible states. Add tests for every accepted URL shape, regression, service error, and state transition. Prefer behavior-oriented assertions such as `findByRole('alert')`; avoid testing private implementation details. Run `npm test`, `npm run lint`, and `npm run build` before opening a pull request.

## Commit & Pull Request Guidelines

Use concise Conventional Commits, for example `feat: add snapshot lookup` or `fix: reject playlist URLs`. Pull requests should explain the user impact, list verification commands, link relevant issues, and include screenshots for UI changes. Call out API contract, environment-variable, or snapshot-schema changes explicitly.

## Security & Configuration

Never place credentials in `VITE_*` variables or client code. Store local values in `.env.local`, validate untrusted URLs, and keep transcript, search, and AI credentials in the backend. Do not add a snapshot unless its transcript, claims, and source links have been reviewed.
