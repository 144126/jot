import { transcribe } from '#lib/server/stt';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { t, e } = await transcribe(await request.arrayBuffer());
	if (e && !t) return new Response(e, { status: 502 });
	return new Response(t);
};
