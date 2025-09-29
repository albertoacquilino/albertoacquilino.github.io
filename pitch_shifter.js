(function (global) {
  "use strict";

  const TWO_PI = Math.PI * 2;
  const MIN_RATIO = 0.01;

  function fft(buffer, frameSize, inverse) {
    const sign = inverse ? 1 : -1;
    const n = frameSize << 1;

    let target = 0;
    for (let position = 0; position < n; position += 2) {
      if (target > position) {
        const tmpReal = buffer[target];
        const tmpImag = buffer[target + 1];
        buffer[target] = buffer[position];
        buffer[target + 1] = buffer[position + 1];
        buffer[position] = tmpReal;
        buffer[position + 1] = tmpImag;
      }

      let step = frameSize;
      while (step && (target & step)) {
        target &= ~step;
        step >>= 1;
      }
      target |= step;
    }

    for (let size = 2; size <= n; size <<= 1) {
      const halfsize = size >> 1;
      const tablestep = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = i, k = 0; j < i + halfsize; j += 2, k += tablestep) {
          const l = j + halfsize;
          const angle = sign * Math.PI * k / frameSize;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          const treal = buffer[l] * cos - buffer[l + 1] * sin;
          const timag = buffer[l] * sin + buffer[l + 1] * cos;

          buffer[l] = buffer[j] - treal;
          buffer[l + 1] = buffer[j + 1] - timag;
          buffer[j] += treal;
          buffer[j + 1] += timag;
        }
      }
    }

    if (inverse) {
      for (let i = 0; i < n; i++) {
        buffer[i] /= frameSize;
      }
    }
  }

  class ChannelState {
    constructor(fftFrameSize, overlap) {
      this.fftFrameSize = fftFrameSize;
      this.osamp = overlap;
      this.halfSize = fftFrameSize >> 1;
      this.step = fftFrameSize / overlap;

      const doubled = fftFrameSize * 2;

      this.inFifo = new Float32Array(doubled);
      this.outFifo = new Float32Array(doubled);
      this.fftWorkspace = new Float32Array(doubled);
      this.lastPhase = new Float32Array(this.halfSize + 1);
      this.sumPhase = new Float32Array(this.halfSize + 1);
      this.outputAccum = new Float32Array(doubled);
      this.anaMagn = new Float32Array(this.halfSize + 1);
      this.anaFreq = new Float32Array(this.halfSize + 1);
      this.synMagn = new Float32Array(this.halfSize + 1);
      this.synFreq = new Float32Array(this.halfSize + 1);
      this.window = new Float32Array(fftFrameSize);

      for (let k = 0; k < fftFrameSize; k++) {
        this.window[k] = -0.5 * Math.cos(TWO_PI * k / fftFrameSize) + 0.5;
      }

      this.rover = 0;
    }
  }

  class PitchShifter {
    constructor(context, options = {}) {
      this.context = context;
      this.fftFrameSize = options.fftFrameSize || 2048;
      this.overlap = options.overlap || 4;
      this.channels = Math.max(1, options.channels || 2);

      this.pitchRatio = 1;

      this.channelStates = [];
      this._initProcessor();
    }

    _initProcessor() {
      const bufferSize = this.fftFrameSize;
      this.processor = this.context.createScriptProcessor(bufferSize, this.channels, this.channels);

      const sampleRate = this.context.sampleRate;
      for (let ch = 0; ch < this.channels; ch++) {
        const state = new ChannelState(this.fftFrameSize, this.overlap);
        state.freqPerBin = sampleRate / this.fftFrameSize;
        state.expct = TWO_PI * state.step / this.fftFrameSize;
        this.channelStates.push(state);
      }

      this.processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const outputBuffer = event.outputBuffer;
        const channelCount = outputBuffer.numberOfChannels;
        const ratio = Math.max(MIN_RATIO, this.pitchRatio);

        for (let ch = 0; ch < channelCount; ch++) {
          const input = inputBuffer.getChannelData(ch);
          const output = outputBuffer.getChannelData(ch);

          if (Math.abs(ratio - 1) < 1e-4) {
            output.set(input);
            continue;
          }

          this._processChannel(this.channelStates[ch], input, output, ratio);
        }
      };
    }

    _processChannel(state, input, output, pitchRatio) {
      if (!state) return;

      const { fftFrameSize, halfSize, step, inFifo, outFifo, fftWorkspace,
        lastPhase, sumPhase, outputAccum, anaMagn, anaFreq, synMagn, synFreq,
        window, osamp, freqPerBin, expct } = state;

      let rover = state.rover;
      if (!rover) {
        rover = fftFrameSize;
      }

      const numSamples = input.length;

      for (let i = 0; i < numSamples; i++) {
        inFifo[rover] = input[i];
        output[i] = outFifo[rover - fftFrameSize];
        outFifo[rover - fftFrameSize] = 0;

        rover++;

        if (rover >= fftFrameSize) {
          rover -= fftFrameSize;

          for (let k = 0; k < fftFrameSize; k++) {
            fftWorkspace[2 * k] = inFifo[k] * window[k];
            fftWorkspace[2 * k + 1] = 0;
          }

          fft(fftWorkspace, fftFrameSize, false);

          for (let k = 0; k <= halfSize; k++) {
            const real = fftWorkspace[2 * k];
            const imag = fftWorkspace[2 * k + 1];
            const magn = 2 * Math.hypot(real, imag);
            let phase = Math.atan2(imag, real);

            let deltaPhase = phase - lastPhase[k];
            lastPhase[k] = phase;

            deltaPhase -= k * expct;
            let qpd = deltaPhase / Math.PI;
            qpd = qpd >= 0 ? qpd + (qpd % 2) : qpd - (qpd % 2);
            deltaPhase -= Math.PI * qpd;

            deltaPhase = (deltaPhase * osamp) / TWO_PI;
            deltaPhase = k + deltaPhase;

            anaMagn[k] = magn;
            anaFreq[k] = deltaPhase * freqPerBin;
          }

          synMagn.fill(0);
          synFreq.fill(0);

          for (let k = 0; k <= halfSize; k++) {
            const index = Math.floor(k * pitchRatio);
            if (index <= halfSize) {
              synMagn[index] += anaMagn[k];
              synFreq[index] = anaFreq[k] * pitchRatio;
            }
          }

          for (let k = 0; k <= halfSize; k++) {
            const magn = synMagn[k];
            let tmp = synFreq[k];

            tmp -= k * freqPerBin;
            tmp = (tmp / freqPerBin) * (TWO_PI / osamp);
            tmp += k * expct;

            sumPhase[k] += tmp;
            const phase = sumPhase[k];

            fftWorkspace[2 * k] = magn * Math.cos(phase);
            fftWorkspace[2 * k + 1] = magn * Math.sin(phase);

            if (k > 0 && k < halfSize) {
              const revIndex = fftFrameSize - k;
              fftWorkspace[2 * revIndex] = magn * Math.cos(-phase);
              fftWorkspace[2 * revIndex + 1] = magn * Math.sin(-phase);
            }
          }

          fft(fftWorkspace, fftFrameSize, true);

          for (let k = 0; k < fftFrameSize; k++) {
            outputAccum[k] += 2 * window[k] * fftWorkspace[2 * k] / (fftFrameSize * osamp);
          }

          for (let k = 0; k < step; k++) {
            outFifo[k] = outputAccum[k];
          }

          outputAccum.copyWithin(0, step, step + fftFrameSize);
          outputAccum.fill(0, fftFrameSize, fftFrameSize + step);

          inFifo.copyWithin(0, step, step + fftFrameSize);
          inFifo.fill(0, fftFrameSize, fftFrameSize + step);
        }
      }

      state.rover = rover;
    }

    connect(destination) {
      this.processor.connect(destination);
    }

    disconnect() {
      this.processor.disconnect();
    }

    get node() {
      return this.processor;
    }

    setSemitoneOffset(semitones) {
      const ratio = Math.pow(2, semitones / 12);
      this.pitchRatio = Math.max(MIN_RATIO, ratio);
    }
  }

  global.PitchShifter = PitchShifter;
})(window);
