# Contributing

Thanks for helping improve Stablecoin Payroll.

## Setup

```bash
pnpm install
cp .env.example .env   # set JWT_SECRET
pnpm db:seed
pnpm dev:all
```

See the [README](README.md) for full details.

## Workflow

1. Fork and branch off `main` (`feat/...`, `fix/...`).
2. Make your change. Keep it focused — smallest change that solves the problem.
3. Match the existing style. Run `pnpm format` and `pnpm check`.
4. Add or update tests for behavior changes:
   ```bash
   npx vitest run --config vitest.config.ts server/tests/
   ```
5. Open a PR with a clear description of what changed and why.

## Guidelines

- **Mode-gate features.** Don't expose EOR-only features (trust deposit, tripartite contracts) to non-EOR clients.
- **Tenant-scope every query.** Use `req.ctx.tenantId` / `req.ctx.clientId` on list endpoints.
- **Use design tokens.** Style from `client/src/index.css` tokens, not inline hex.
- **No secrets in commits.** Keep credentials in `.env` (gitignored).

## Adding a statutory engine

Add a country module under `server/services/statutory/` next to `my.ts` / `sg.ts`, register it, and cover it with tests in `server/tests/`.

## Reporting issues

Open an issue with repro steps, expected vs actual behavior, and environment details.
