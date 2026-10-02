// Phonon-2 is one request at a time. Finals stay in order. A new partial
// replaces an older one that has not started yet. A final drops waiting
// partials and aborts an in-flight partial so the utterance is not stuck.

type Kind = 'p' | 'f'; // p = live so far, f = finished utterance

type Job = {
	pcm: Float32Array;
	k: Kind;
	ok: (t: string) => void;
};

export class Stt {
	private q: Job[] = [];
	private busy = false;
	private inflight: Kind | null = null;
	private abort: AbortController | null = null;
	on_live: ((t: string) => void) | null = null;

	constructor(private send: (pcm: Float32Array, signal: AbortSignal) => Promise<string>) {}

	partial(pcm: Float32Array): void {
		this.q = this.q.filter((j) => j.k !== 'p');
		this.q.push({ pcm, k: 'p', ok: () => {} });
		void this.pump();
	}

	final(pcm: Float32Array): Promise<string> {
		return new Promise((ok) => {
			this.q = this.q.filter((j) => j.k !== 'p');
			this.q.push({ pcm, k: 'f', ok });
			if (this.inflight === 'p') this.abort?.abort();
			void this.pump();
		});
	}

	private async pump(): Promise<void> {
		if (this.busy) return;
		const job = this.q.shift();
		if (!job) return;
		this.busy = true;
		this.inflight = job.k;
		this.abort = new AbortController();
		try {
			const t = await this.send(job.pcm, this.abort.signal);
			job.ok(t);
			if (job.k === 'p' && t) this.on_live?.(t);
		} catch {
			job.ok('');
		} finally {
			this.busy = false;
			this.inflight = null;
			this.abort = null;
			void this.pump();
		}
	}
}
