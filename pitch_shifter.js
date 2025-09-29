(function (global) {
  "use strict";

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

  class PitchShifter {
    constructor(context, options = {}) {
      this.context = context;
      this.fftFrameSize = options.fftFrameSize || 2048;
      this.osamp = options.overlap || 4;
      this.channels = options.channels || 2;

      this.pitchRatio = 1;

      this._setup();
    }

    _setup() {
      const bufferSize = this.fftFrameSize;
      this.processor = this.context.createScriptProcessor(bufferSize, this.channels, this.channels);

      this.sampleRate = this.context.sampleRate;
      this.halfFrame = this.fftFrameSize >> 1;
      this.step = this.fftFrameSize / this.osamp;
      this.freqPerBin = this.sampleRate / this.fftFrameSize;
      this.expct = 2.0 * Math.PI * this.step / this.fftFrameSize;

      const sizeFft = this.fftFrameSize;
      const halfFrame = this.halfFrame;

      this.gInFIFO = new Float32Array(sizeFft * 2);
      this.gOutFIFO = new Float32Array(sizeFft * 2);
      this.gFFTworksp = new Float32Array(sizeFft * 2);
      this.gLastPhase = new Float32Array(halfFrame + 1);
      this.gSumPhase = new Float32Array(halfFrame + 1);
      this.gOutputAccum = new Float32Array(sizeFft * 2);
      this.gAnaFreq = new Float32Array(halfFrame + 1);
      this.gAnaMagn = new Float32Array(halfFrame + 1);
      this.gSynFreq = new Float32Array(halfFrame + 1);
      this.gSynMagn = new Float32Array(halfFrame + 1);
      this.gWindow = new Float32Array(sizeFft);

      for (let k = 0; k < sizeFft; k++) {
        this.gWindow[k] = -0.5 * Math.cos(2 * Math.PI * k / sizeFft) + 0.5;
      }

      this.gRover = halfFrame;

      this.processor.onaudioprocess = (event) => {
        const channels = event.outputBuffer.numberOfChannels;
        for (let ch = 0; ch < channels; ch++) {
          const input = event.inputBuffer.getChannelData(ch);
          const output = event.outputBuffer.getChannelData(ch);
          if (Math.abs(this.pitchRatio - 1) < 1e-4) {
            output.set(input);
          } else {
            this.smbPitchShift(this.pitchRatio, input, output);
          }
        }
      };
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
      this.pitchRatio = Math.pow(2, semitones / 12);
    }

    smbPitchShift(pitchShift, input, output) {
      const fftFrameSize = this.fftFrameSize;
      const halfFrame = this.halfFrame;
      const step = this.step;
      const freqPerBin = this.freqPerBin;
      const expct = this.expct;

      const inFifo = this.gInFIFO;
      const outFifo = this.gOutFIFO;
      const fftBuf = this.gFFTworksp;
      const lastPhase = this.gLastPhase;
      const sumPhase = this.gSumPhase;
      const outputAccum = this.gOutputAccum;
      const anaMagn = this.gAnaMagn;
      const anaFreq = this.gAnaFreq;
      const synMagn = this.gSynMagn;
      const synFreq = this.gSynFreq;
      const window = this.gWindow;

      let rover = this.gRover;

      for (let i = 0; i < input.length; i++) {
        inFifo[rover] = input[i];
        const fifoIndex = rover - halfFrame;
        output[i] = outFifo[fifoIndex];
        outFifo[fifoIndex] = 0;

        rover++;

        if (rover >= fftFrameSize) {
          rover = halfFrame;

          for (let k = 0; k < fftFrameSize; k++) {
            fftBuf[2 * k] = inFifo[k] * window[k];
            fftBuf[2 * k + 1] = 0;
          }

          fft(fftBuf, fftFrameSize, false);

          for (let k = 0; k <= halfFrame; k++) {
            const real = fftBuf[2 * k];
            const imag = fftBuf[2 * k + 1];
            const magn = 2 * Math.hypot(real, imag);
            let phase = Math.atan2(imag, real);

            let tmp = phase - lastPhase[k];
            lastPhase[k] = phase;

            tmp -= k * expct;
            let qpd = tmp / Math.PI;
            if (qpd >= 0) {
              qpd += qpd % 2;
            } else {
              qpd -= qpd % 2;
            }
            tmp -= Math.PI * qpd;

            tmp = (tmp * this.osamp) / (2 * Math.PI);
            tmp = k + tmp;

            anaMagn[k] = magn;
            anaFreq[k] = tmp * freqPerBin;
          }

          synMagn.fill(0);
          synFreq.fill(0);

          for (let k = 0; k <= halfFrame; k++) {
            const index = Math.floor(k * pitchShift);
            if (index <= halfFrame) {
              synMagn[index] += anaMagn[k];
              synFreq[index] = anaFreq[k] * pitchShift;
            }
          }

          for (let k = 0; k <= halfFrame; k++) {
            const magn = synMagn[k];
            let tmp = synFreq[k];

            tmp -= k * freqPerBin;
            tmp = tmp * (fftFrameSize / step);
            tmp = (2 * Math.PI * tmp) / this.sampleRate;
            tmp += k * expct;

            sumPhase[k] += tmp;
            const phase = sumPhase[k];

            fftBuf[2 * k] = magn * Math.cos(phase);
            fftBuf[2 * k + 1] = magn * Math.sin(phase);

            if (k > 0 && k < halfFrame) {
              fftBuf[2 * (fftFrameSize - k)] = magn * Math.cos(-phase);
              fftBuf[2 * (fftFrameSize - k) + 1] = magn * Math.sin(-phase);
            }
          }

          fft(fftBuf, fftFrameSize, true);

          for (let k = 0; k < fftFrameSize; k++) {
            const value = 2 * window[k] * fftBuf[2 * k] / (fftFrameSize * this.osamp);
            outputAccum[k] += value;
          }

          for (let k = 0; k < step; k++) {
            outFifo[k] = outputAccum[k];
          }

          outputAccum.copyWithin(0, step, step + fftFrameSize);
          outputAccum.fill(0, fftFrameSize, fftFrameSize + step);

          inFifo.copyWithin(0, step, step + halfFrame);
          inFifo.fill(0, halfFrame, fftFrameSize * 2);
        }
      }

      this.gRover = rover;
    }
  }

  global.PitchShifter = PitchShifter;
})(window);
