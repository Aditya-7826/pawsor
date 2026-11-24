# AGENTS.md

Pawsor is a Manifest V3 browser extension (Chrome, Edge, Brave): a cartoon puppy that
lives on every page and follows the cursor. Vite + vanilla TypeScript, no backend.

## Source of Truth

- [docs/PRD.md](docs/PRD.md): what to build, acceptance criteria, Definition of Done
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md): tokens, components, states, accessibility
- [docs/CODE_STYLE.md](docs/CODE_STYLE.md): language, structure, naming and commit rules
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): modules, build, injection, state machine,
  render loop, data flow, failure scenarios, key technical decisions

## Commands

- `npm run build`: build the unpacked extension into `dist/`
- `npm run lint`: ESLint + Prettier check
- `npm run typecheck`: `tsc --noEmit`
- `npm run test`: Vitest

## Constraints

- Permissions: `storage` only. No host permissions, `tabs`, `scripting` or remote code.
- No dependencies beyond those listed in `docs/CODE_STYLE.md`.
- No images or audio files except extension icons; no frameworks or animation libraries.
- State transitions live only in the pure `transition` function.
- The dog must never block clicks, typing, scrolling or selection on any page.
