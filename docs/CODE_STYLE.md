# Pawsor — Code Style

## Language and tooling

- TypeScript `strict`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- ESLint flat config with `typescript-eslint` recommended + type-checked rules.
- Prettier: single quotes, semicolons, 2-space indent, width 100, trailing commas, LF.
- Vitest with `jsdom`. `chrome.*` APIs are faked in tests (`src/test/chrome-fake.ts`).
- Dev dependencies only: Vite, TypeScript, ESLint + `typescript-eslint` + `globals`,
  Prettier, Vitest, jsdom, `@types/chrome`. No runtime dependencies.

## Structure

- `src/content/` runs on web pages; `src/popup/` is the popup; `src/background/` is the
  service worker; `src/shared/` is code used by more than one of them.
- Pure logic (state machine, motion math, wiggle detection, settings parsing) has no DOM
  or `chrome.*` access and is unit tested.
- DOM and `chrome.*` code stays in thin adapter modules.
- Files stay under ~250 lines.

## Naming

- Files `kebab-case.ts`; tests `*.test.ts` beside the module.
- Types `PascalCase`; functions and variables `camelCase`; constants `UPPER_SNAKE_CASE`
  in `src/content/config.ts` (dog) or `src/shared/settings.ts` (settings).
- CSS classes inside the Shadow Root use the `pawsor-` prefix; state goes in `data-*`.

## Rules

- No `any`. No non-null assertions outside tests.
- Discriminated unions for states and events; exhaustive `switch` with a `never` check.
- No magic numbers outside config modules.
- Pure logic receives time as a parameter; never `Date.now()` inside it.
- Content script listeners are `passive`, registered with an `AbortController` and
  removed on teardown. Never `preventDefault` or `stopPropagation` page events.
- Read layout before writing it within a frame; animate only `transform` and `opacity`.
- Every `chrome.*` call in the content script is wrapped so an invalidated extension
  context tears Pawsor down quietly.
- The content bundle must not contain `import` statements at runtime (checked in build).
- Comments explain _why_, not _what_.

## Commits

- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `build:`, `test:`).
- Each commit passes `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- Commit messages contain only the message.
- Pushing and force actions follow the Git permissions in `CLAUDE.md`.
