import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { lqFetch } from '$lib/server/lqClient';
import {
	parseChatSearchHits,
	parseNamedList,
	parseSkillSummaries,
	parseUserSkills,
	filterByQuery,
	buildGroup,
	type PaletteGroup,
	type PaletteItem
} from '$lib/palette/search';

const MIN_QUERY = 2;

/** A failed or malformed source degrades to [] — the palette never breaks
 *  because one backend list is down (honest-degradation house rule). */
async function fetchItems(
	event: Parameters<RequestHandler>[0],
	path: string,
	parse: (raw: unknown) => PaletteItem[]
): Promise<PaletteItem[]> {
	try {
		const res = await lqFetch(event, path);
		if (!res.ok) return [];
		return parse(await res.json());
	} catch {
		return [];
	}
}

export const GET: RequestHandler = async (event) => {
	const q = (event.url.searchParams.get('q') ?? '').trim();
	if (q.length < MIN_QUERY) return json({ groups: [] satisfies PaletteGroup[] });

	const enc = encodeURIComponent(q);
	const [chats, matters, knowledge, playbooks, userSkills, builtinSkills, promptsRaw] =
		await Promise.all([
			fetchItems(event, `/api/v1/chats/search?q=${enc}&limit=5`, parseChatSearchHits),
			fetchItems(event, '/api/v1/projects', (r) => parseNamedList(r, (id) => `/matters/${id}`)),
			fetchItems(event, '/api/v1/knowledge-bases', (r) =>
				parseNamedList(r, (id) => `/knowledge/${id}`)
			),
			fetchItems(event, '/api/v1/playbooks', (r) => parseNamedList(r, (id) => `/playbooks/${id}`)),
			fetchItems(event, '/api/v1/user-skills?scope=user', parseUserSkills),
			fetchItems(event, '/api/v1/skills?scope=builtin', parseSkillSummaries),
			fetchItems(event, '/api/v1/saved-prompts', (raw) => {
				// SavedPrompt has no description; fold tags + prompt_text into the
				// searchable subtitle so "find the prompt about X" works.
				if (!Array.isArray(raw)) return [];
				const items: PaletteItem[] = [];
				for (const row of raw) {
					const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
					if (typeof r.id !== 'string' || typeof r.name !== 'string') continue;
					const tags = Array.isArray(r.tags) ? r.tags.filter((t) => typeof t === 'string') : [];
					const text = typeof r.prompt_text === 'string' ? r.prompt_text : '';
					const subtitle = [tags.join(', '), text].filter(Boolean).join(' — ') || null;
					items.push({ id: r.id, title: r.name, subtitle, href: '/prompts' });
				}
				return items;
			})
		]);

	const groups = [
		buildGroup('chat', 'Chats', chats), // backend-ranked; no re-filter
		buildGroup('matter', 'Matters', filterByQuery(matters, q)),
		buildGroup('knowledge', 'Knowledge bases', filterByQuery(knowledge, q)),
		buildGroup('playbook', 'Playbooks', filterByQuery(playbooks, q)),
		buildGroup('skill', 'Skills', filterByQuery([...userSkills, ...builtinSkills], q)),
		buildGroup('prompt', 'Saved prompts', filterByQuery(promptsRaw, q))
	].filter((g): g is PaletteGroup => g !== null);

	return json({ groups });
};
