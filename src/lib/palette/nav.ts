// src/lib/palette/nav.ts
// Static "Go to" destinations for the ⌘K palette. Mirrors the sidebar's
// top-level routes; shown unfiltered when the query is empty.

import type { PaletteItem } from './search';

export const NAV_ITEMS: PaletteItem[] = [
	{ id: 'home', title: 'Home', subtitle: 'Start a chat', href: '/' },
	{ id: 'matters', title: 'Matters', subtitle: 'Your matters and files', href: '/matters' },
	{ id: 'knowledge', title: 'Knowledge', subtitle: 'Knowledge bases', href: '/knowledge' },
	{ id: 'workflows', title: 'Workflows', subtitle: 'Workflows hub', href: '/workflows' },
	{ id: 'skills', title: 'Skills', subtitle: 'Built-in and your skills', href: '/skills' },
	{ id: 'playbooks', title: 'Playbooks', subtitle: 'Review standards', href: '/playbooks' },
	{ id: 'prompts', title: 'Saved prompts', subtitle: 'Reusable prompts', href: '/prompts' },
	{ id: 'automations', title: 'Automations', subtitle: 'Autonomous runs', href: '/automations' },
	{ id: 'tabular', title: 'Tabular review', subtitle: 'Document grid review', href: '/tabular' },
	{ id: 'settings', title: 'Settings', subtitle: 'Account and providers', href: '/settings' },
	{ id: 'about', title: 'About Donna', subtitle: 'Guide and playgrounds', href: '/about' }
];

/** Empty query → everything (the palette's resting state); otherwise the
 *  same substring match the entity groups use. */
export function filterNav(query: string): PaletteItem[] {
	const q = query.trim().toLowerCase();
	if (!q) return NAV_ITEMS;
	return NAV_ITEMS.filter(
		(i) => i.title.toLowerCase().includes(q) || (i.subtitle?.toLowerCase().includes(q) ?? false)
	);
}
