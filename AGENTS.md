# Repository Guidelines

## Project Structure & Module Organization
- `src/core/`: main processing flow (`processor.ts`, parsing, upload orchestration).
- `src/adapters/`: image host adapters (`wechat.adapter.ts`, `aliyun.adapter.ts`).
- `src/utils/` and `src/types/`: shared utilities and TypeScript types.
- `src/web/`: Express server and API routes (`server.js`, `api.js`).
- `config/default.json`: runtime configuration for image hosts and upload behavior.
- `public/`: static web UI assets.
- `downloads/` and `dist/`: generated at runtime/build time; do not commit outputs.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run build`: compile TypeScript from `src/` to `dist/`.
- `npm start`: run Express server (`src/web/server.js`).
- `npm run dev`: run server with `nodemon` for local iteration.
- `npm run clean`: remove generated artifacts (`downloads`, `dist`).

Example local workflow:
```bash
npm install
npm run build
npm start
```
Note: `src/web/api.js` imports `dist/core/processor`, so rebuild after TypeScript changes.

## Coding Style & Naming Conventions
- Use 2-space indentation, single quotes, and semicolons (match current codebase).
- Keep TypeScript `strict` compatibility; avoid `any` unless justified.
- Naming: `PascalCase` for classes, `camelCase` for functions/variables, and lowercase file names with descriptive suffixes (for example, `aliyun.adapter.ts`).
- Keep modules focused: adapter logic in `src/adapters`, orchestration in `src/core`.

## Testing Guidelines
- No automated test suite is configured yet.
- Minimum validation for changes:
  1. `npm run build` succeeds.
  2. `POST /api/health` and changed API paths are smoke-tested locally.
  3. For processing changes, verify one real Markdown upload/replace flow end-to-end.
- If adding tests, place them under `src/**/__tests__` or `tests/` and document the run command in `package.json`.

## Commit & Pull Request Guidelines
- This workspace snapshot has no `.git` history, so commit conventions cannot be inferred directly.
- Use Conventional Commits going forward (for example, `feat(core): add retry guard for uploads`).
- PRs should include: purpose, key changes, manual verification steps, config impact, and UI/API screenshots or sample responses when behavior changes.

## Security & Configuration Tips
- Never commit real secrets in `config/default.json` or `.env*`.
- Ensure `feishu2md` is installed and available in `PATH` before using download endpoints.
