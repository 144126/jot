import { apply } from '#lib/server/edit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { t, s } = (await request.json()) as { t: string; s: string };
	// t = document text, s = spoken instruction
	const out = await apply(t ?? '', s ?? '');
	if (out.e) return new Response(out.e, { status: 502 });
	return new Response(out.t);
};
