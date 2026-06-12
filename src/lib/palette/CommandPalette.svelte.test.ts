/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import CommandPalette from './CommandPalette.svelte';

const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...a: unknown[]) => goto(...a) }));

afterEach(() => {
	goto.mockReset();
	vi.unstubAllGlobals();
});

describe('CommandPalette', () => {
	it('shows the nav destinations when the query is empty', () => {
		const { getByText } = render(CommandPalette, { props: { onclose: vi.fn() } });
		expect(getByText('Go to')).toBeInTheDocument();
		expect(getByText('Matters')).toBeInTheDocument();
		expect(getByText('Playbooks')).toBeInTheDocument();
	});

	it('navigates and closes on Enter (first item selected by default)', async () => {
		const onclose = vi.fn();
		const { getByLabelText } = render(CommandPalette, { props: { onclose } });
		await userEvent.type(getByLabelText('Search'), '{Enter}');
		expect(onclose).toHaveBeenCalled();
		expect(goto).toHaveBeenCalledWith('/');
	});

	it('arrow keys move the selection before Enter', async () => {
		const onclose = vi.fn();
		const { getByLabelText } = render(CommandPalette, { props: { onclose } });
		await userEvent.type(getByLabelText('Search'), '{ArrowDown}{Enter}');
		expect(goto).toHaveBeenCalledWith('/matters');
	});

	it('closes on Escape without navigating', async () => {
		const onclose = vi.fn();
		const { getByLabelText } = render(CommandPalette, { props: { onclose } });
		await userEvent.type(getByLabelText('Search'), '{Escape}');
		expect(onclose).toHaveBeenCalled();
		expect(goto).not.toHaveBeenCalled();
	});

	it('renders fetched entity groups for a query', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						groups: [
							{
								kind: 'matter',
								label: 'Matters',
								items: [
									{ id: 'm1', title: 'Hendricks v. Doyle', subtitle: null, href: '/matters/m1' }
								]
							}
						]
					}),
					{ status: 200 }
				)
			)
		);
		const { getByLabelText, findByText } = render(CommandPalette, { props: { onclose: vi.fn() } });
		await userEvent.type(getByLabelText('Search'), 'hendricks');
		expect(
			await findByText('Hendricks v. Doyle', undefined, { timeout: 2000 })
		).toBeInTheDocument();
	});
});
