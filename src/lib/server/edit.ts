// Apply one spoken instruction to the document. Returns the full new text.

import { JOT_LLM_MODEL, JOT_LLM_URL, OPENROUTER_API_KEY } from '$app/env/private';

const SYS =
	'you edit a text document by voice command. the user speaks a short instruction. apply it to the document and return only the full new document text. if the instruction is not an edit, treat the spoken words as text to insert. keep every other word unchanged.';

export function bare(s: string): string {
	return s
		.trim()
		.replace(/^```(?:\w+)?\n?/, '')
		.replace(/\n?```$/, '');
}

export async function apply(t: string, s: string): Promise<{ t: string; e?: string }> {
	if (!s.trim()) return { t, e: 'empty instruction' };
	if (!t.trim()) return { t: s };
	if (!OPENROUTER_API_KEY) return { t, e: 'missing OPENROUTER_API_KEY' };
	try {
		const r = await fetch(JOT_LLM_URL, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${OPENROUTER_API_KEY}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				model: JOT_LLM_MODEL,
				messages: [
					{ role: 'system', content: SYS },
					{ role: 'user', content: `document:\n${t}\n\ninstruction: ${s}` }
				],
				temperature: 0
			})
		});
		if (!r.ok) return { t, e: await r.text() };
		const j = (await r.json()) as { choices: { message: { content: string } }[] };
		return { t: bare(j.choices[0].message.content ?? '') };
	} catch (err) {
		return { t, e: String(err) };
	}
}
