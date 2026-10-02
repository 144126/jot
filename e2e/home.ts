import { expect, test } from '@playwright/test';

test('home shows the pad', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByPlaceholder('talk to edit this')).toBeVisible();
	await expect(page.getByText('off')).toBeVisible();
});
