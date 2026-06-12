// src/lib/palette/search.ts
// Defensively-parsed view models for the ⌘K command palette's /search BFF
// route. Each source parses independently and malformed rows drop rather
// than throw (per the findings.ts/schedules.ts precedent) so one bad source
// can never break the palette.

export type PaletteKind = 'chat' | 'matter' | 'knowledge' | 'playbook' | 'skill' | 'prompt';

export interface PaletteItem {
	id: string;
	title: string;
	subtitle: string | null;
	href: string;
}

export interface PaletteGroup {
	kind: PaletteKind;
	label: string;
	items: PaletteItem[];
}

const GROUP_CAP = 5;

function str(v: unknown): string | null {
	return typeof v === 'string' ? v : null;
}
function obj(v: unknown): Record<string, unknown> {
	return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

/** GET /chats/search hits — backend-ranked FTS with a snippet. */
export function parseChatSearchHits(raw: unknown): PaletteItem[] {
	const arr = Array.isArray(obj(raw).items) ? (obj(raw).items as unknown[]) : [];
	const items: PaletteItem[] = [];
	for (const row of arr) {
		const r = obj(row);
		if (typeof r.chat_id !== 'string') continue;
		items.push({
			id: r.chat_id,
			title: str(r.title) ?? 'Untitled chat',
			subtitle: str(r.snippet),
			href: `/chats/${r.chat_id}`
		});
	}
	return items;
}

/** Generic id+name lists (projects, knowledge bases, playbooks, saved prompts). */
export function parseNamedList(raw: unknown, href: (id: string) => string): PaletteItem[] {
	if (!Array.isArray(raw)) return [];
	const items: PaletteItem[] = [];
	for (const row of raw) {
		const r = obj(row);
		const name = str(r.name);
		if (typeof r.id !== 'string' || !name) continue;
		items.push({ id: r.id, title: name, subtitle: str(r.description), href: href(r.id) });
	}
	return items;
}

/** GET /user-skills?scope=user — owned skills; archived rows are hidden. */
export function parseUserSkills(raw: unknown): PaletteItem[] {
	if (!Array.isArray(raw)) return [];
	const items: PaletteItem[] = [];
	for (const row of raw) {
		const r = obj(row);
		const title = str(r.display_name);
		if (typeof r.id !== 'string' || !title || r.archived_at) continue;
		items.push({ id: r.id, title, subtitle: str(r.description), href: `/skills/${r.id}` });
	}
	return items;
}

/** GET /skills?scope=builtin — summaries keyed by name; no detail page, so
 *  builtins route to the /skills hub where they're listed. */
export function parseSkillSummaries(raw: unknown): PaletteItem[] {
	if (!Array.isArray(raw)) return [];
	const items: PaletteItem[] = [];
	for (const row of raw) {
		const r = obj(row);
		const name = str(r.name);
		if (!name) continue;
		items.push({
			id: name,
			title: str(r.title) ?? name,
			subtitle: str(r.description),
			href: '/skills'
		});
	}
	return items;
}

/** Case-insensitive substring match over title + subtitle. Lists at this
 *  product stage are small; no index needed client- or server-side. */
export function filterByQuery(items: PaletteItem[], query: string): PaletteItem[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	return items.filter(
		(i) => i.title.toLowerCase().includes(q) || (i.subtitle?.toLowerCase().includes(q) ?? false)
	);
}

export function buildGroup(
	kind: PaletteKind,
	label: string,
	items: PaletteItem[]
): PaletteGroup | null {
	if (items.length === 0) return null;
	return { kind, label, items: items.slice(0, GROUP_CAP) };
}
