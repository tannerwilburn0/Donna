<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import CommandPalette from '$lib/palette/CommandPalette.svelte';
	import { rebrandName } from '$lib/brand';
	let { data, children } = $props();
	const displayName = $derived(
		rebrandName(data.user?.display_name) || data.user?.email?.split('@')[0] || 'Account'
	);

	let paletteOpen = $state(false);

	function onkeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			paletteOpen = !paletteOpen;
		}
	}
</script>

<svelte:window {onkeydown} />

<div class="flex h-screen overflow-hidden">
	<Sidebar {displayName} />
	<main class="flex-1 overflow-y-auto">
		{@render children()}
	</main>
</div>

{#if paletteOpen}
	<CommandPalette onclose={() => (paletteOpen = false)} />
{/if}
