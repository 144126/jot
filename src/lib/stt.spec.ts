import { describe, expect, it } from 'vitest';
import { Stt } from './stt';

function pcm(n: number): Float32Array {
	return new Float32Array(n);
}

function tick(): Promise<void> {
	return new Promise((r) => setTimeout(r, 0));
}

describe('Stt', () => {
	it('drops a waiting partial when a newer one arrives', async () => {
		const sent: number[] = [];
		let release = () => {};
		const first = new Promise<void>((r) => {
			release = r;
		});
		const stt = new Stt(async (p) => {
			sent.push(p.length);
			if (sent.length === 1) await first;
			return String(p.length);
		});
		const live: string[] = [];
		stt.on_live = (t) => live.push(t);
		stt.partial(pcm(1));
		await tick();
		stt.partial(pcm(2));
		stt.partial(pcm(3));
		release();
		await tick();
		await tick();
		expect(sent).toEqual([1, 3]);
		expect(live).toEqual(['1', '3']);
	});

	it('drops a waiting partial when a final arrives', async () => {
		const kinds: string[] = [];
		let release = () => {};
		const first = new Promise<void>((r) => {
			release = r;
		});
		const stt = new Stt(async (p) => {
			kinds.push(p.length === 9 ? 'f' : 'p');
			if (kinds.length === 1) await first;
			return 'x';
		});
		stt.partial(pcm(1));
		await tick();
		stt.partial(pcm(2));
		const done = stt.final(pcm(9));
		release();
		await done;
		expect(kinds).toEqual(['p', 'f']);
	});

	it('aborts an in-flight partial when a final arrives', async () => {
		const kinds: string[] = [];
		const stt = new Stt(async (p, signal) => {
			kinds.push(p.length === 9 ? 'f' : 'p');
			if (p.length !== 9) {
				await new Promise<void>((ok, no) => {
					signal.addEventListener('abort', () => no(new DOMException('aborted', 'AbortError')));
				});
			}
			return 'ok';
		});
		stt.partial(pcm(1));
		await tick();
		const t = await stt.final(pcm(9));
		expect(t).toBe('ok');
		expect(kinds).toEqual(['p', 'f']);
	});
});
