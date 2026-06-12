import { describe, it, expect } from 'vitest';
import {
	parseChatSearchHits,
	parseNamedList,
	parseSkillSummaries,
	parseUserSkills,
	filterByQuery,
	buildGroup
} from './search';

describe('parseChatSearchHits', () => {
	it('maps hits to palette items with chat hrefs', () => {
		const items = parseChatSearchHits({
			items: [{ chat_id: 'c1', title: 'Hendricks deposition', snippet: 'the witness said…' }]
		});
		expect(items).toEqual([
			{
				id: 'c1',
				title: 'Hendricks deposition',
				subtitle: 'the witness said…',
				href: '/chats/c1'
			}
		]);
	});

	it('drops malformed rows and tolerates junk input', () => {
		expect(parseChatSearchHits(null)).toEqual([]);
		expect(parseChatSearchHits({ items: 'nope' })).toEqual([]);
		expect(parseChatSearchHits({ items: [{ title: 'no id' }, 42] })).toEqual([]);
	});
});

describe('parseNamedList', () => {
	it('maps id+name rows and drops rows without an id or name', () => {
		const items = parseNamedList(
			[
				{ id: 'm1', name: 'Hendricks v. Doyle', description: 'IP dispute' },
				{ id: 'm2' },
				{ name: 'orphan' },
				'junk'
			],
			(id) => `/matters/${id}`
		);
		expect(items).toEqual([
			{ id: 'm1', title: 'Hendricks v. Doyle', subtitle: 'IP dispute', href: '/matters/m1' }
		]);
	});

	it('returns [] on non-array input', () => {
		expect(parseNamedList({ items: [] }, (id) => id)).toEqual([]);
	});
});

describe('skill parsers', () => {
	it('parses user skills to /skills/{id} and skips archived', () => {
		const items = parseUserSkills([
			{ id: 's1', display_name: 'Cite checker', description: 'verifies cites' },
			{ id: 's2', display_name: 'Old', archived_at: '2026-01-01T00:00:00Z' }
		]);
		expect(items).toEqual([
			{ id: 's1', title: 'Cite checker', subtitle: 'verifies cites', href: '/skills/s1' }
		]);
	});

	it('parses builtin summaries keyed by name to the /skills page', () => {
		const items = parseSkillSummaries([
			{ name: 'redline', title: 'Redline review', description: 'compares drafts' },
			{ title: 'nameless' }
		]);
		expect(items).toEqual([
			{ id: 'redline', title: 'Redline review', subtitle: 'compares drafts', href: '/skills' }
		]);
	});
});

describe('filterByQuery', () => {
	const items = [
		{ id: '1', title: 'Hendricks v. Doyle', subtitle: 'IP dispute', href: '/a' },
		{ id: '2', title: 'Smith NDA', subtitle: null, href: '/b' }
	];

	it('matches case-insensitively against title and subtitle', () => {
		expect(filterByQuery(items, 'hendricks')).toHaveLength(1);
		expect(filterByQuery(items, 'DISPUTE')).toHaveLength(1);
		expect(filterByQuery(items, 'nda')).toEqual([items[1]]);
	});

	it('returns nothing for a non-matching query', () => {
		expect(filterByQuery(items, 'zzz')).toEqual([]);
	});
});

describe('buildGroup', () => {
	it('caps items at 5 and returns null for an empty source', () => {
		const many = Array.from({ length: 9 }, (_, i) => ({
			id: String(i),
			title: `t${i}`,
			subtitle: null,
			href: `/x/${i}`
		}));
		const group = buildGroup('matter', 'Matters', many);
		expect(group?.items).toHaveLength(5);
		expect(buildGroup('matter', 'Matters', [])).toBeNull();
	});
});
