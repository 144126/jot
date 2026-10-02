// Proxy to Phonon-2 (the same model pi uses for voice). Raw wav in, plain text out.

import { JOT_STT_TOKEN, JOT_STT_URL } from '$app/env/private';

export async function transcribe(wav: ArrayBuffer): Promise<{ t: string; e?: string }> {
	if (wav.byteLength < 1000) return { t: '', e: 'too short' };
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
