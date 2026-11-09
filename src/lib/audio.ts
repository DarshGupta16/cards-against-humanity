// Web Audio API sound synthesizer with zero external dependencies and memory safety

class SoundEffects {
	private ctx: AudioContext | null = null;
	private noiseBuffer: AudioBuffer | null = null;
	public enabled: boolean = true;

	constructor() {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("cah_sound_enabled");
			this.enabled = saved !== "false";
		}
	}

	private getContext(): AudioContext | null {
		if (typeof window === "undefined") return null;
		if (!this.ctx) {
			const AudioCtx =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext })
					.webkitAudioContext;
			if (AudioCtx) {
				this.ctx = new AudioCtx();
				this.prebuildNoiseBuffer();
			}
		}
		if (this.ctx && this.ctx.state === "suspended") {
			this.ctx.resume().catch(() => {
				// Safe catch for browsers that block resume before gesture
			});
		}
		return this.ctx;
	}

	private prebuildNoiseBuffer() {
		if (!this.ctx || this.noiseBuffer) return;
		const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
		const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
		}
		this.noiseBuffer = buffer;
	}

	public toggle(): boolean {
		this.enabled = !this.enabled;
		if (typeof window !== "undefined") {
			localStorage.setItem("cah_sound_enabled", String(this.enabled));
		}
		if (this.enabled) {
			this.playSelect();
		}
		return this.enabled;
	}

	// Subtle tactile tap / hover
	public playHover() {
		if (!this.enabled) return;
		// Don't wake un-resumed AudioContext on pure hover to respect autoplay policies (F-16)
		if (this.ctx?.state !== "running") return;
		const ctx = this.ctx;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(320, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.04);

		gain.gain.setValueAtTime(0.015, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.onended = () => {
			osc.disconnect();
			gain.disconnect();
		};

		osc.start();
		osc.stop(ctx.currentTime + 0.04);
	}

	// Card select click
	public playSelect() {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "triangle";
		osc.frequency.setValueAtTime(480, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.06);

		gain.gain.setValueAtTime(0.05, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.onended = () => {
			osc.disconnect();
			gain.disconnect();
		};

		osc.start();
		osc.stop(ctx.currentTime + 0.06);
	}

	// Card slide whoosh using pre-cached buffer (F-18)
	public playDeal() {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		if (!this.noiseBuffer) {
			this.prebuildNoiseBuffer();
		}
		if (!this.noiseBuffer) return;

		const noise = ctx.createBufferSource();
		noise.buffer = this.noiseBuffer;

		const filter = ctx.createBiquadFilter();
		filter.type = "bandpass";
		filter.frequency.setValueAtTime(1200, ctx.currentTime);
		filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.12);

		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0.06, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

		noise.connect(filter);
		filter.connect(gain);
		gain.connect(ctx.destination);

		noise.onended = () => {
			noise.disconnect();
			filter.disconnect();
			gain.disconnect();
		};

		noise.start();
	}

	// Card snap onto table
	public playSnap() {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(180, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.09);

		gain.gain.setValueAtTime(0.12, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.onended = () => {
			osc.disconnect();
			gain.disconnect();
		};

		osc.start();
		osc.stop(ctx.currentTime + 0.09);
	}

	// Quick pleasant pop for actions/updates
	public playPop() {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(450, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.06);

		gain.gain.setValueAtTime(0.08, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.onended = () => {
			osc.disconnect();
			gain.disconnect();
		};

		osc.start();
		osc.stop(ctx.currentTime + 0.06);
	}

	// Low thud for disband/destructive actions
	public playThud() {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "triangle";
		osc.frequency.setValueAtTime(130, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.12);

		gain.gain.setValueAtTime(0.15, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.onended = () => {
			osc.disconnect();
			gain.disconnect();
		};

		osc.start();
		osc.stop(ctx.currentTime + 0.12);
	}

	// Card reveal flip chime
	public playReveal() {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "triangle";
		osc.frequency.setValueAtTime(350, now);
		osc.frequency.exponentialRampToValueAtTime(700, now + 0.1);

		gain.gain.setValueAtTime(0.06, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.onended = () => {
			osc.disconnect();
			gain.disconnect();
		};

		osc.start();
		osc.stop(now + 0.12);
	}

	// Victory fanfare
	public playWin() {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const notes = [523.25, 659.25, 783.99, 1046.5];
		notes.forEach((freq, idx) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			const startTime = ctx.currentTime + idx * 0.08;
			const duration = 0.5;

			osc.type = "triangle";
			osc.frequency.setValueAtTime(freq, startTime);

			gain.gain.setValueAtTime(0.05, startTime);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.onended = () => {
				osc.disconnect();
				gain.disconnect();
			};

			osc.start(startTime);
			osc.stop(startTime + duration);
		});
	}
}

export const sound = new SoundEffects();
