// Serial async work. One job at a time, in order. Nothing is dropped.

export type QJob<T> = { id: number; v: T }; // v = job value

export class Queue<T> {
	private q: QJob<T>[] = [];
	private next = 1;
	private busy = false;
	n = 0; // waiting + running

	constructor(private run: (job: T) => Promise<void>) {}

	push(v: T): void {
		this.q.push({ id: this.next++, v });
		this.n++;
		void this.pump();
	}

	get waiting(): QJob<T>[] {
		return this.q.slice();
	}

	private async pump(): Promise<void> {
		if (this.busy) return;
		const job = this.q.shift();
		if (!job) return;
		this.busy = true;
		try {
			await this.run(job.v);
		} catch {
			// keep the rest of the queue moving
		} finally {
			this.busy = false;
			this.n--;
			void this.pump();
		}
	}
}
