// Browser-side speech capture: mic -> 16k mono float samples, cut on silence.
// VAD is energy-based with an adaptive noise floor, so no wasm model is needed.

export type MicEvent = 'speech_start' | 'silence';

export const SAMPLE_RATE = 16000;
const SPEECH_ON_DB = -42; // above this = speech
const SPEECH_OFF_DB = -50; // below this = quiet (hysteresis)
const SILENCE_MS = 700; // quiet time that ends an utterance
const MIN_UTT_MS = 300; // ignore blips
const PARTIAL_MS = 900; // how often to transcribe the utterance so far

function rms_db(pcm: Float32Array): number {
	let sum = 0;
	for (let i = 0; i < pcm.length; i++) sum += pcm[i] * pcm[i];
	return 20 * Math.log10(Math.sqrt(sum / pcm.length) + 1e-10);
}

export class Mic {
	private ctx: AudioContext | null = null;
	private stream: MediaStream | null = null;
	private node: AudioWorkletNode | null = null;
	private source: MediaStreamAudioSourceNode | null = null;

	private buf: number[] = [];
	private speaking = false;
	private noise_db = -60;
	private last_loud_at = 0;
	private last_partial_at = 0;
	private running = false;

	/** a finished utterance, ready to transcribe */
	on_utterance: ((pcm: Float32Array) => void) | null = null;
	/** the utterance so far, for live transcription. does not cut the buffer. */
	on_partial: ((pcm: Float32Array) => void) | null = null;
	on_event: ((e: MicEvent) => void) | null = null;

	async start(): Promise<void> {
		this.stream = await navigator.mediaDevices.getUserMedia({
			audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
		});
		this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
		await this.ctx.audioWorklet.addModule(worklet_url);
		this.source = this.ctx.createMediaStreamSource(this.stream);
		this.node = new AudioWorkletNode(this.ctx, 'jot-capture');
		this.node.port.onmessage = (e) => this.on_frame(e.data as Float32Array);
		this.source.connect(this.node);
		this.running = true;
		this.last_loud_at = performance.now();
	}

	stop(): void {
		this.running = false;
		this.source?.disconnect();
		this.stream?.getTracks().forEach((t) => t.stop());
		void this.ctx?.close();
		this.ctx = null;
		this.node = null;
		this.speaking = false;
		this.buf = [];
	}

	private on_frame(pcm: Float32Array): void {
		if (!this.running) return;
		const now = performance.now();
		const db = rms_db(pcm);
		const loud = db > SPEECH_OFF_DB;

		if (!loud && !this.speaking) this.noise_db = this.noise_db * 0.98 + db * 0.02;

		if (this.speaking) {
			this.buf.push(...pcm);
			if (loud) this.last_loud_at = now;
			else if (now - this.last_loud_at > SILENCE_MS) {
				this.end(Float32Array.from(this.buf));
				this.buf = [];
				return;
			}
			if (now - this.last_partial_at > PARTIAL_MS) this.flush_partial();
			return;
		}

		if (db > Math.max(SPEECH_ON_DB, this.noise_db + 12)) {
			this.speaking = true;
			this.buf = [...pcm];
			this.last_loud_at = now;
			this.last_partial_at = now;
			this.on_event?.('speech_start');
		}
	}

	private end(pcm: Float32Array): void {
		this.speaking = false;
		this.on_event?.('silence');
		if (pcm.length >= SAMPLE_RATE * (MIN_UTT_MS / 1000)) this.on_utterance?.(pcm);
	}

	private flush_partial(): void {
		if (!this.buf.length) return;
		this.last_partial_at = performance.now();
		this.on_partial?.(Float32Array.from(this.buf));
	}
}

// the capture processor, inlined as a blob so there is no second file to ship
const worklet_url = URL.createObjectURL(
	new Blob(
		[
			`class JotCapture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0][0];
    if (ch) this.port.postMessage(new Float32Array(ch));
    return true;
  }
}
registerProcessor('jot-capture', JotCapture);`
		],
		{ type: 'application/javascript' }
	)
);
