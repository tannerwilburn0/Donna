<script lang="ts">
	import { goto } from '$app/navigation';
	import { filterNav } from './nav';
	import type { PaletteGroup, PaletteItem } from './search';

	let { onclose }: { onclose: () => void } = $props();

	let query = $state('');
	let groups: PaletteGroup[] = $state([]);
	let selected = $state(0);
	let input: HTMLInputElement | undefined = $state();
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let lastIssued = 0;

	const navItems = $derived(filterNav(query));
	const flat = $derived([...navItems, ...groups.flatMap((g) => g.items)]);

	$effect(() => {
		input?.focus();
	});

	function search(q: string) {
		clearTimeout(debounceTimer);
		if (q.trim().length < 2) {
			groups = [];
			selected = 0;
			return;
		}
		debounceTimer = setTimeout(async () => {
			const issued = ++lastIssued;
			try {
				const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
				if (!res.ok || issued !== lastIssued) return; // last-query-wins
				const body = (await res.json()) as { groups: PaletteGroup[] };
				if (issued !== lastIssued) return;
				groups = body.groups;
				selected = 0;
			} catch {
				// degraded search leaves nav items usable; never surface an error here
			}
		}, 150);
	}

	function oninput() {
		search(query);
	}

	function pick(item: PaletteItem) {
		onclose();
		goto(item.href);
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onclose();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			selected = Math.min(selected + 1, flat.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selected = Math.max(selected - 1, 0);
		} else if (e.key === 'Enter' && flat[selected]) {
			e.preventDefault();
			pick(flat[selected]);
		}
	}

	// flat index of the first item in each rendered section, so highlight
	// tracking survives the grouped markup
	const navOffset = 0;
	function groupOffset(gi: number): number {
		let n = navItems.length;
		for (let i = 0; i < gi; i++) n += groups[i].items.length;
		return n;
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[15vh]"
	role="presentation"
	onclick={(e) => {
		if (e.target === e.currentTarget) onclose();
	}}
>
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Command palette"
		class="w-full max-w-lg overflow-hidden rounded-mlq-control border border-mlq-subtle bg-mlq-surface shadow-lg"
	>
		<input
			bind:this={input}
			bind:value={query}
			{oninput}
			{onkeydown}
			placeholder="Search chats, matters, knowledge, workflows…"
			aria-label="Search"
			class="w-full border-b border-mlq-subtle bg-transparent px-4 py-3 text-sm outline-none"
		/>
		<div class="max-h-[50vh] overflow-y-auto p-2">
			{#if navItems.length}
				<p class="px-2 pt-1 pb-0.5 text-xs font-semibold tracking-wide text-mlq-muted uppercase">
					Go to
				</p>
				{#each navItems as item, i (item.id)}
					<button
						type="button"
						class="flex w-full items-baseline gap-2 rounded-mlq-control px-2 py-1.5 text-left text-sm
							{navOffset + i === selected ? 'bg-mlq-subtle text-mlq-strong' : 'text-mlq-text'}"
						onmouseenter={() => (selected = navOffset + i)}
						onclick={() => pick(item)}
					>
						<span>{item.title}</span>
						{#if item.subtitle}<span class="truncate text-xs text-mlq-muted">{item.subtitle}</span
							>{/if}
					</button>
				{/each}
			{/if}
			{#each groups as group, gi (group.kind)}
				<p class="px-2 pt-2 pb-0.5 text-xs font-semibold tracking-wide text-mlq-muted uppercase">
					{group.label}
				</p>
				{#each group.items as item, i (item.id)}
					<button
						type="button"
						class="flex w-full items-baseline gap-2 rounded-mlq-control px-2 py-1.5 text-left text-sm
							{groupOffset(gi) + i === selected ? 'bg-mlq-subtle text-mlq-strong' : 'text-mlq-text'}"
						onmouseenter={() => (selected = groupOffset(gi) + i)}
						onclick={() => pick(item)}
					>
						<span class="shrink-0">{item.title}</span>
						{#if item.subtitle}<span class="truncate text-xs text-mlq-muted">{item.subtitle}</span
							>{/if}
					</button>
				{/each}
			{/each}
			{#if !navItems.length && !groups.length}
				<p class="px-2 py-3 text-sm text-mlq-muted">No matches.</p>
			{/if}
		</div>
	</div>
</div>
