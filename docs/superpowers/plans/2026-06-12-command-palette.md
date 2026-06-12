# Plan — global ⌘K command palette

Spec: [../specs/2026-06-12-donna-command-palette-design.md](../specs/2026-06-12-donna-command-palette-design.md)

## Task 1 — search lib (pure, TDD)

`src/lib/palette/search.ts`: `PaletteItem`/`PaletteGroup` types, defensive parsers
(`parseChatSearchHits`, `parseNamedList`, `parseUserSkills`, `parseSkillSummaries`),
`filterByQuery`, `buildGroup` (5-item cap, null for empty). Tests first in `search.test.ts`:
malformed rows drop, junk input tolerated, case-insensitive matching, group cap.

## Task 2 — /search BFF route (TDD)

`src/routes/(app)/search/+server.ts`: `GET ?q=` → `{ groups }`. Queries under 2 chars short-circuit
without backend calls. Parallel fan-out via `lqFetch` to chats `/chats/search` (backend FTS,
no re-filter), projects, knowledge-bases, playbooks, user-skills + builtin skills, saved-prompts
(tags + prompt_text folded into the searchable subtitle). Every source degrades independently
to an empty group. Tests in `server.test.ts` with mocked `lqFetch`, routed by path prefix so
fan-out order doesn't matter: happy path, partial source failure, short query, prompt-text match.

## Task 3 — CommandPalette component + layout wiring (TDD)

`src/lib/palette/nav.ts`: static destinations + `filterNav` (empty query → all).
`src/lib/palette/CommandPalette.svelte`: autofocused input, 150 ms debounce, last-query-wins
fetch guard, flattened keyboard selection across nav + entity groups (Arrow/Enter/Esc),
mouse hover sync, backdrop click closes. `(app)/+layout.svelte` hosts the `⌘K`/`Ctrl+K`
toggle via `<svelte:window>`. Component tests: resting nav state, Enter navigates + closes,
arrow selection, Escape, fetched groups render.

## Task 4 — gates + live e2e

`npm run check` 0/0 · lint green · `npx vitest run` full suite. Live e2e
`tests/command-palette.spec.ts` (self-cleaning: seeds a saved prompt via the `/prompts/items`
BFF proxy, deletes it in `finally`): open via shortcut, nav resting state, entity search hit,
Escape, keyboard navigation to /knowledge. Gotcha hit: `page.keyboard.press('Enter')` flaked
on a remounted palette; `locator.press('Enter')` (actionability-checked) is reliable.
