// Proxy to the local Phonon-2 server (the same model pi uses for voice).
// Raw wav in, plain text out.

import { JOT_STT_URL } from '$app/env/private';

export async function transcribe(wav: ArrayBuffer): Promise<{ t: string; e?: string }> {
	if (wav.byteLength < 1000) return { t: '', e: 'too short' };
	try {
		const r = await fetch(JOT_STT_URL, { method: 'POST', body: wav });
		if (!r.ok) return { t: '', e: `stt ${r.status}` };
		return { t: (await r.text()).trim() };
	} catch (err) {
		return { t: '', e: String(err) };
	}
}
