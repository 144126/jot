import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'pnpm dev --port 4173 --host',
		port: 4173,
		reuseExistingServer: true
	},
	testMatch: 'e2e/**/*.ts'
});
