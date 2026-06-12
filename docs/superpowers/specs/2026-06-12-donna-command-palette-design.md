# Donna — global command palette (⌘K) design

2026-06-12. Status: shipped.

## Problem

Donna's surface area (Matters, Knowledge, Chats, Skills, Playbooks, Prompts, Automations, Tabular)
is reachable only via the sidebar + each page's own list. A user mid-thought must remember _where_
an entity lives before navigating to it. A global palette makes everything one keystroke away.

## Scope

A `⌘K` / `Ctrl+K` command palette, available on every authed page, that:

1. **Navigates** — static destinations (Home, Matters, Knowledge, Skills, Playbooks, Prompts,
   Automations, Tabular, Workflows, Settings, About) always searchable.
2. **Searches entities** across: chats (backend FTS), matters, knowledge bases, playbooks,
   skills (user + builtin), saved prompts. Selecting a hit routes to its page.

Out of scope (v1): files (no global list endpoint), actions-with-arguments ("run playbook X on Y"),
automations/tabular executions (transient, poorly named for search).

## Contract

No backend change. One new BFF proxy route, mirroring the `prompts/items` precedent:

```
GET /search?q=<query>   (src/routes/(app)/search/+server.ts)
→ 200 { groups: PaletteGroup[] }
```

```ts
interface PaletteItem {
	id: string;
	title: string;
	subtitle: string | null; // snippet / description / slug
	href: string;
}
interface PaletteGroup {
	kind: 'chat' | 'matter' | 'knowledge' | 'playbook' | 'skill' | 'prompt';
	label: string;
	items: PaletteItem[]; // capped at 5 per group
}
```

Server fans out in parallel via the authed `lqFetch`:

| Source    | Endpoint                                                    | Match                  | Href                                        |
| --------- | ----------------------------------------------------------- | ---------------------- | ------------------------------------------- |
| chats     | `GET /chats/search?q=&limit=5` (ranked FTS)                 | backend                | `/chats/{chat_id}`                          |
| matters   | `GET /projects`                                             | name/slug/description  | `/matters/{id}`                             |
| knowledge | `GET /knowledge-bases`                                      | name/description       | `/knowledge/{id}`                           |
| playbooks | `GET /playbooks`                                            | name/description       | `/playbooks/{id}`                           |
| skills    | `GET /user-skills?scope=user` + `GET /skills?scope=builtin` | title/slug/description | `/skills/{id}` (user) · `/skills` (builtin) |
| prompts   | `GET /saved-prompts`                                        | name/tags/prompt_text  | `/prompts`                                  |

Client-side substring filtering (case-insensitive) for sources without a backend search; lists are
small at this product stage. **Honest degradation:** each sub-fetch degrades independently to an
empty group — a failed source disappears, never breaks the palette. All parsing is defensive
(`parseXList(raw: unknown)` style, per `findings.ts` precedent): malformed rows drop, never throw.

## UX

- `⌘K` / `Ctrl+K` toggles; `Esc` closes; listener lives in `(app)/+layout.svelte` so it works on
  every authed page. Ignored when typing in an input/textarea/contenteditable (except the palette's
  own input).
- Modal overlay, input on top, grouped results below. Navigation group ("Go to") shown first and
  filtered by the same query; entity groups appear once the query is ≥ 2 chars (debounced 150 ms).
- Arrow keys move selection across the flattened list; `Enter` navigates (`goto`) and closes;
  click does the same. Stale responses discarded (last-query-wins).
- Empty query → navigation items only. No results → quiet "No matches." line.

## Files

- `src/lib/palette/search.ts` — types, defensive parsers, `filterByQuery`, group builders (pure,
  unit-tested).
- `src/lib/palette/nav.ts` — static destination list + filter (pure, unit-tested).
- `src/routes/(app)/search/+server.ts` — thin fan-out proxy (server-tested with mocked `lqFetch`).
- `src/lib/palette/CommandPalette.svelte` — the UI (component-tested).
- `src/routes/(app)/+layout.svelte` — mounts the palette + key listener.

## Testing

- Vitest unit: parsers drop malformed rows; query filter; group caps; nav filter.
- Vitest server: `+server.ts` with mocked `lqFetch` — happy path, partial source failure (group
  omitted, others intact), short query returns nav-only/empty groups.
- Component: renders groups, keyboard selection moves, Enter calls `goto`, Esc closes.
- Live e2e: `tests/command-palette.spec.ts` — self-cleaning (seeds a saved prompt via the BFF,
  deletes in `finally`): shortcut open, nav resting state, entity hit, Escape, keyboard navigation.
