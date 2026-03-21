# FRONTEND GUIDE

## OVERVIEW
`fe/` is the workspace frontend app. Keep this guide lightweight and local to frontend development.

## STRUCTURE
```text
fe/
├── src/             # App code and styles
├── public/          # Static assets
├── vite.config.js   # Vite config
├── eslint.config.js # Frontend lint config
└── package.json     # Frontend-local scripts
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| App bootstrap | `src/main.jsx` | Start here for frontend entry behavior |
| Main UI changes | `src/` | Most feature work stays in the source tree |
| Local dev behavior | `vite.config.js` | Vite dev-server settings live here |
| Lint rules | `eslint.config.js` | Frontend linting behavior lives here |

## CONVENTIONS
- Keep frontend-only changes inside `fe/`; do not add UI-specific rules to the workspace root.
- The app currently uses JavaScript/JSX, not TypeScript. Match the existing file format unless the user asks for a migration.
- Prefer frontend-local commands from `fe/package.json` when you are working only in this app.
- Check `vite.config.js` before changing local API request behavior.

## ANTI-PATTERNS (THIS PROJECT)
- Do not edit `dist/`; rebuild with Vite.
- Do not bypass Vite config with scattered local-dev request hacks.
- Do not introduce deeper AGENTS files under `fe/` unless this app becomes meaningfully larger.

## COMMANDS
```bash
npm install
npm run dev
npm run build
npm run lint
npm run preview
```

## NOTES
- Root `npm run dev` starts this app together with the backend.
- Keep frontend guidance brief; the app is still small enough not to need deeper local docs.
