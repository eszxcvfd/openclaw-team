# PROJECT KNOWLEDGE BASE

## OVERVIEW
This repo is a workspace wrapper around three real contributor domains: `be/` (NestJS backend), `fe/` (Vite React frontend), and `openclaw/` (large nested pnpm monorepo). Root-level guidance should stay short and route you to the local guide for the area you are changing.

## STRUCTURE
```text
./
├── be/         # Backend API and Prisma work
├── fe/         # Small React + Vite web app
├── openclaw/   # Full upstream-style product monorepo
├── .opencode/  # Tooling assets/examples; not app runtime
└── README.md   # Root setup and dev commands
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Run the local starter workspace | `package.json` | Root uses npm only to orchestrate `be/` and `fe/` |
| Backend API work | `be/AGENTS.md` | Local backend rules and commands live there |
| Frontend app work | `fe/AGENTS.md` | Small Vite app; no deeper guide needed |
| OpenClaw product work | `openclaw/AGENTS.md` | Separate toolchain, tests, and child guides |
| Cross-system architecture context | `system-workflow-architecture.md` | Explains FE -> BE -> OpenClaw flow |

## CONVENTIONS
- Root package management is `npm`; `openclaw/` uses its own `pnpm` workspace and should be treated separately.
- Keep root guidance cross-cutting only. Put app-specific rules in `be/AGENTS.md`, `fe/AGENTS.md`, or `openclaw/AGENTS.md`.
- Treat generated and bundled outputs as read-only unless you are intentionally running their source generator.

## ANTI-PATTERNS (THIS PROJECT)
- Do not assume one toolchain covers the whole repo; `npm` at root does not replace `pnpm` inside `openclaw/`.
- Do not edit generated or build outputs like `be/dist/`, `openclaw/docs/.generated/`, or bundled assets such as `openclaw/src/canvas-host/a2ui/a2ui.bundle.js`.
- Do not expand the AGENTS hierarchy casually; only add a child guide when a subtree has a clearly different workflow.

## COMMANDS
```bash
npm run setup
npm run dev
npm run dev:backend
npm run dev:frontend
npm run build
```

## NOTES
- `be/` and `openclaw/` already have local guidance; read those before editing inside those trees.
- `fe/` is intentionally lightweight and now has its own local guide.
- `openclaw/` already contains narrower child guides for documentation and gateway server methods; do not duplicate them at root.
