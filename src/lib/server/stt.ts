// Speech to text. Prefer Cloudflare Whisper when the AI binding is present.
// Else hit Phonon-2 (local or the public tunnel).

import { JOT_STT_TOKEN, JOT_STT_URL } from '$app/env/private';

export async function transcribe(wav: ArrayBuffer, ai?: Ai): Promise<{ t: string; e?: string }> {
	if (wav.byteLength < 1000) return { t: '', e: 'too short' };
	if (ai) {
		try {
			const out = await ai.run('@cf/openai/whisper', {
				audio: [...new Uint8Array(wav)]
			});
			const t = (out.text ?? '').trim();
			if (t) return { t };
		} catch (err) {
			return { t: '', e: String(err) };
		}
	}
	if (!JOT_STT_URL) return { t: '', e: 'no stt' };
	const headers: Record<string, string> = {};
	if (JOT_STT_TOKEN) headers.authorization = `Bearer ${JOT_STT_TOKEN}`;
	try {
		const r = await fetch(JOT_STT_URL, { method: 'POST', body: wav, headers });
		if (!r.ok) return { t: '', e: `stt ${r.status}` };
		return { t: (await r.text()).trim() };
	} catch (err) {
		return { t: '', e: String(err) };
	}
}
