// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
const lqFetch = vi.fn();
vi.mock('$lib/server/lqClient', () => ({ lqFetch: (...a: unknown[]) => lqFetch(...a) }));
import { GET } from './+server';
import type { PaletteGroup } from '$lib/palette/search';

beforeEach(() => lqFetch.mockReset());

function event(q: string) {
	return { url: new URL(`http://localhost/search?q=${encodeURIComponent(q)}`) } as never;
}

function ok(body: unknown) {
	return new Response(JSON.stringify(body), { status: 200 });
}

/** Route the mock by endpoint so parallel fan-out order doesn't matter. */
function routeMock(routes: Record<string, Response>) {
	lqFetch.mockImplementation((_e: unknown, path: unknown) => {
		for (const [prefix, res] of Object.entries(routes)) {
			if (String(path).startsWith(prefix)) return Promise.resolve(res.clone());
		}
		return Promise.resolve(new Response('x', { status: 500 }));
	});
}

async function groups(res: Response): Promise<PaletteGroup[]> {
	return ((await res.json()) as { groups: PaletteGroup[] }).groups;
}

describe('GET /search', () => {
	it('returns empty groups for a short query without calling the backend', async () => {
		const res = await GET(event('a'));
		expect(await groups(res)).toEqual([]);
		expect(lqFetch).not.toHaveBeenCalled();
	});

	it('fans out and returns matching groups', async () => {
		routeMock({
			'/api/v1/chats/search': ok({
				items: [{ chat_id: 'c1', title: 'Hendricks dep', snippet: 's' }]
			}),
			'/api/v1/projects': ok([{ id: 'm1', name: 'Hendricks v. Doyle' }]),
			'/api/v1/knowledge-bases': ok([{ id: 'k1', name: 'Discovery docs' }]),
			'/api/v1/playbooks': ok([{ id: 'pb1', name: 'NDA playbook' }]),
			'/api/v1/user-skills': ok([{ id: 's1', display_name: 'Cite checker' }]),
			'/api/v1/skills': ok([{ name: 'redline', title: 'Redline review' }]),
			'/api/v1/saved-prompts': ok([{ id: 'sp1', name: 'Summarize deposition' }])
		});
		const out = await groups(await GET(event('hendricks')));
		const kinds = out.map((g) => g.kind);
		expect(kinds).toEqual(['chat', 'matter']);
		expect(out[0].items[0].href).toBe('/chats/c1');
		expect(out[1].items[0].href).toBe('/matters/m1');
	});

	it('omits a failed source but keeps the others (honest degradation)', async () => {
		routeMock({
			'/api/v1/chats/search': new Response('x', { status: 500 }),
			'/api/v1/projects': ok([{ id: 'm1', name: 'Hendricks v. Doyle' }])
		});
		const out = await groups(await GET(event('hendricks')));
		expect(out.map((g) => g.kind)).toEqual(['matter']);
	});

	it('searches prompt tags and text, not just names', async () => {
		routeMock({
			'/api/v1/saved-prompts': ok([
				{ id: 'sp1', name: 'Weekly memo', prompt_text: 'summarize hendricks filings' }
			])
		});
		const out = await groups(await GET(event('hendricks')));
		expect(out.map((g) => g.kind)).toEqual(['prompt']);
	});
});
