# BACKEND GUIDE

## OVERVIEW
`be/` is the workspace backend service. Use this guide for API, backend config, Prisma, and server-side integration work.

## STRUCTURE
```text
be/
├── src/            # Application source
├── prisma/         # Prisma schema and migrations
├── docs/           # Backend-specific docs
└── package.json    # Backend-local scripts
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| App bootstrap | `src/main.ts` | Start here for server startup behavior |
| Root module wiring | `src/app.module.ts` | Entry point for backend dependency tracing |
| Feature work | `src/modules/` | Main home for backend feature code |
| Shared config | `src/config/` | Environment-driven backend configuration |
| DB integration | `src/infra/prisma/`, `prisma/` | Prisma service plus schema/migration assets |
| System context | `../system-workflow-architecture.md` | Cross-system workflow and boundaries |

## CONVENTIONS
- Keep backend-specific behavior in `be/`; do not push NestJS or Prisma rules up to the workspace root.
- Match the existing structure under `src/` instead of creating ad-hoc top-level folders.
- Prefer changing source under `src/` and `prisma/`; generated output belongs in `dist/`.
- When behavior spans frontend, backend, and OpenClaw, read `../system-workflow-architecture.md` and `../openclaw/AGENTS.md` before changing contracts.

## ANTI-PATTERNS (THIS PROJECT)
- Do not edit `dist/` or `tsconfig.tsbuildinfo`; rebuild instead.
- Do not treat root npm scripts as a replacement for backend-local commands when working only in `be/`.
- Do not make non-local database changes without explicit user approval.

## COMMANDS
```bash
npm install
npm run dev
npm run build
npm run start
```

## NOTES
- Keep this file short. Detailed backend architecture belongs in `docs/`.
- Do not add deeper AGENTS files unless a backend subtree develops its own workflow or operational constraints.
