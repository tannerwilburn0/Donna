import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.DONNA_E2E_EMAIL!;
const PASSWORD = process.env.DONNA_E2E_PASSWORD!;

async function login(page: Page) {
	await page.goto('/login');
	await page.fill('input[name="email"]', EMAIL);
	await page.fill('input[name="password"]', PASSWORD);
	await page.click('button:has-text("Sign in")');
	await page.waitForURL('/');
}

test('⌘K palette: nav, entity search, keyboard navigation', async ({ page }) => {
	test.setTimeout(90_000);
	const name = `E2E Palette Prompt ${Date.now()}`;

	await login(page);

	// Seed a searchable entity through the existing BFF proxy (cookies ride
	// along on page.request); cleaned up in finally.
	const created = await page.request.post('/prompts/items', {
		data: { name, prompt_text: 'palette e2e marker' }
	});
	expect(created.ok()).toBeTruthy();
	const promptId = ((await created.json()) as { id: string }).id;

	try {
		// Open with the platform shortcut; resting state shows nav destinations.
		await page.keyboard.press('ControlOrMeta+k');
		const dialog = page.getByRole('dialog', { name: 'Command palette' });
		await expect(dialog).toBeVisible();
		await expect(dialog.getByText('Go to')).toBeVisible();
		await expect(dialog.getByRole('button', { name: /Matters/ })).toBeVisible();

		// Entity search: the seeded prompt surfaces under "Saved prompts".
		await dialog.getByLabel('Search').fill(name);
		await expect(dialog.getByText('Saved prompts')).toBeVisible();
		await expect(dialog.getByRole('button', { name: new RegExp(name) })).toBeVisible();

		// Escape closes without navigating.
		await page.keyboard.press('Escape');
		await expect(dialog).not.toBeVisible();
		await expect(page).toHaveURL('/');

		// Keyboard flow: reopen, filter to a nav item, Enter navigates.
		await page.keyboard.press('ControlOrMeta+k');
		await dialog.getByLabel('Search').fill('knowledge');
		await dialog.getByLabel('Search').press('Enter');
		await page.waitForURL('/knowledge');
		await expect(dialog).not.toBeVisible();
	} finally {
		await page.request.delete(`/prompts/items/${promptId}`);
	}
});
