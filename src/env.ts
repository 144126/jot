import { defineEnvVars } from '@sveltejs/kit/env';

const opt = { schema: (v: string | undefined) => v ?? '' };

export const variables = defineEnvVars({
	OPENROUTER_API_KEY: opt,
	JOT_STT_URL: { schema: (v: string | undefined) => v || 'http://127.0.0.1:8081/' },
	JOT_STT_TOKEN: opt,
	JOT_LLM_URL: {
		schema: (v: string | undefined) => v || 'https://openrouter.ai/api/v1/chat/completions'
	},
	JOT_LLM_MODEL: { schema: (v: string | undefined) => v || 'openai/gpt-4o-mini' }
});
