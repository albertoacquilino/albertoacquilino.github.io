// script_jamigo_player.js
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    // Choose a source: processed file (future), or demo fallback
    const processedUrl = localStorage.getItem("jamigo_output_url");
    const demoUrl = "assets_jamigo/test.mp3";
    const audio = document.getElementById("audio");

    // If you stored the uploaded filename earlier, show it; else use test.mp3
    const savedName = localStorage.getItem("jamigo_file_name") || "test.mp3";
    const nowPlayingEl = document.getElementById("now-playing");

    // Update audio src (prefer processed)
    if (audio) {
      const src = processedUrl || demoUrl;
      // If the <source> tag exists, just set the <audio> src directly
      audio.src = src;
      // (optional) set the document title
      document.title = `Jamigo – ${savedName}`;
    }

    // Show “Now playing: filename”
    if (nowPlayingEl) {
      // If you use i18n, the text will be replaced; otherwise, set it here:
      if (!nowPlayingEl.hasAttribute("data-i18n")) {
        nowPlayingEl.textContent = `Now playing: ${savedName}`;
      } else {
        // If using i18n key, just insert the filename if needed:
        nowPlayingEl.textContent = nowPlayingEl.textContent.replace("test.mp3", savedName);
      }
    }

    // Optional: show the selected instrument icon (emoji or your bass image)
    const iconDiv = document.getElementById("player-icon");
    const instrument = localStorage.getItem("jamigo_instrument") || "";
    if (iconDiv) {
      const icons = {
        guitar: "🎸",
        drums: "🥁",
        piano: "🎹",
        vocals: "🎤",
        bass: '<img src="assets_jamigo/bass.png" alt="Bass" class="icon-img" />',
        band: "🎶",
      };
      iconDiv.innerHTML = icons[instrument] || "🎵";
    }

    // ── Playback speed controls (0.25x – 4x) ─────────────────────────
    const readout = document.getElementById("rate-readout");
    const slider  = document.getElementById("rate-slider");
    const reset   = document.getElementById("rate-reset");
    const input   = document.getElementById("rate-input");
    const setBtn  = document.getElementById("rate-set-btn");

    if (audio && readout && slider) {
      // Try to preserve pitch when changing speed (browser-dependent)
      try {
        if ("preservesPitch" in audio) audio.preservesPitch = true;
        if ("mozPreservesPitch" in audio) audio.mozPreservesPitch = true;
        if ("webkitPreservesPitch" in audio) audio.webkitPreservesPitch = true;
      } catch {}

      // Restore last chosen speed if available
      const savedRate = parseFloat(localStorage.getItem("jamigo_playback_rate") || "1") || 1;
      setRate(clamp(savedRate, 0.25, 4), { updateUI: true });

      // Reset to 100%
      if (reset) {
        reset.addEventListener("click", () => setRate(1));
      }

      // Custom percent input (25–400%)
      if (setBtn && input) {
        const applyInput = () => {
          let pct = parseFloat(input.value);
          if (Number.isNaN(pct)) pct = 100;
          pct = clamp(pct, 25, 400);
          setRate(pct / 100, { updateUI: true, fromInput: true });
        };
        setBtn.addEventListener("click", applyInput);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); applyInput(); }
        });
      }

      // Fine slider
      slider.addEventListener("input", () => {
        const rate = parseFloat(slider.value);
        setRate(rate, { updateUI: true, fromSlider: true });
      });

      function setRate(rate, { updateUI = false, fromSlider = false, fromInput = false } = {}) {
        const clamped = clamp(rate, 0.25, 4);
        audio.defaultPlaybackRate = clamped; // keep future plays at this rate
        audio.playbackRate = clamped;        // apply immediately
        localStorage.setItem("jamigo_playback_rate", String(clamped));
        readout.textContent = `Speed: ${clamped.toFixed(2)}×`;

        // Gray out the reset icon when already at 1.00×
        if (reset) {
          if (clamped === 1) {
            reset.classList.add("inactive");
          } else {
            reset.classList.remove("inactive");
          }
        }

        if (updateUI) {
          // Keep slider in sync unless it originated the change
          if (!fromSlider) slider.value = clamped;
          // Keep input in sync unless it originated the change
          if (input && !fromInput) input.value = Math.round(clamped * 100);
        }
      }

      function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
      }
    }

    // ── Pitch shift controls (SoundTouch with Jungle fallback) ──────
    const pitchReadout = document.getElementById("pitch-readout");
    const pitchStatus = document.getElementById("pitch-status");
    const pitchDownBtn = document.getElementById("pitch-down");
    const pitchResetBtn = document.getElementById("pitch-reset");
    const pitchUpBtn = document.getElementById("pitch-up");
    const pitchSlider = document.getElementById("pitch-slider");

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    const canUseJungle = typeof Jungle === "function" && typeof AudioContextCtor === "function";
    const PITCH_STORAGE_KEY = "jamigo_pitch_semitone";
    const PITCH_MIN = -6;
    const PITCH_MAX = 6;

    let storedSemitone = parseInt(localStorage.getItem(PITCH_STORAGE_KEY) || "0", 10);
    if (Number.isNaN(storedSemitone)) storedSemitone = 0;
    let currentSemitone = clampPitch(storedSemitone);

    let pitchMode = "auto"; // 'auto' → try SoundTouch, fallback to Jungle
    let pitchJobId = 0;
    let isProcessingPitch = false;
    let queuedSemitone = null;
    let appliedSemitone = currentSemitone;

    const baseAudioSrc = audio ? audio.currentSrc || audio.src : null;
    const soundtouchState = {
      setupPromise: null,
      module: null,
      audioBuffer: null,
      cache: new Map(),
      baseSrc: baseAudioSrc,
    };
    const jungleState = {
      audioCtx: null,
      mediaSource: null,
      dryGain: null,
      pitchedGain: null,
      effect: null,
    };

    if (pitchReadout && pitchDownBtn && pitchResetBtn && pitchUpBtn && pitchSlider && audio) {
      pitchSlider.value = String(currentSemitone);
      updatePitchUI();

      pitchDownBtn.addEventListener("click", () => requestPitchChange(currentSemitone - 1));
      pitchUpBtn.addEventListener("click", () => requestPitchChange(currentSemitone + 1));
      pitchResetBtn.addEventListener("click", () => requestPitchChange(0));

      pitchSlider.addEventListener("input", (event) => {
        const value = parseInt(event.target.value, 10);
        if (!Number.isNaN(value)) {
          requestPitchChange(value);
        }
      });

      audio.addEventListener("play", () => {
        if (pitchMode === "jungle") {
          resumeJungleContext();
        }
      });

      window.addEventListener("beforeunload", cleanupPitchCache);

      if (currentSemitone !== 0) {
        requestPitchChange(currentSemitone, { skipPersist: true, immediate: true });
      }
    } else if (pitchReadout) {
      pitchReadout.textContent = "Pitch: unavailable";
      [pitchDownBtn, pitchResetBtn, pitchUpBtn, pitchSlider].forEach((control) => {
        if (control) control.disabled = true;
      });
    }

    function requestPitchChange(rawSemitone, { skipPersist = false, immediate = false } = {}) {
      const clamped = clampPitch(rawSemitone);
      if (!skipPersist) {
        localStorage.setItem(PITCH_STORAGE_KEY, String(clamped));
      }

       if (!isProcessingPitch && pitchMode !== "auto" && clamped === appliedSemitone) {
        currentSemitone = clamped;
        updatePitchUI();
        return;
      }

      currentSemitone = clamped;
      updatePitchUI();

      queuedSemitone = clamped;
      if (immediate || !isProcessingPitch) {
        processPitchQueue(immediate ? clamped : null);
      }
    }

    function processPitchQueue(forceSemitone = null) {
      if (isProcessingPitch) return;
      const nextSemitone = forceSemitone ?? queuedSemitone;
      if (!Number.isFinite(nextSemitone)) return;
      queuedSemitone = null;

      const jobId = ++pitchJobId;
      isProcessingPitch = true;
      setProcessingPitch(true);

      applyPitchInternal(nextSemitone, jobId)
        .catch((err) => {
          console.error("Jamigo pitch shift failed", err);
          if (pitchReadout) pitchReadout.textContent = "Pitch: error";
        })
        .finally(() => {
          if (jobId === pitchJobId) {
            isProcessingPitch = false;
            setProcessingPitch(false);
            if (queuedSemitone !== null && queuedSemitone !== currentSemitone) {
              processPitchQueue();
            }
          }
        });
    }

    async function applyPitchInternal(semitone, jobId) {
      if (!audio) return;

      if (pitchMode !== "jungle") {
        const soundtouchReady = await ensureSoundtouchSupport();
        if (soundtouchReady && soundtouchState.audioBuffer && soundtouchState.module) {
          pitchMode = "soundtouch";
          await applySoundTouchPitch(semitone, jobId);
          return;
        }
        pitchMode = canUseJungle ? "jungle" : "unavailable";
      }

      if (pitchMode === "jungle" && canUseJungle) {
        // Ensure original source is active before routing through Jungle.
        if (soundtouchState.baseSrc && audio.src !== soundtouchState.baseSrc) {
          await swapAudioSource(soundtouchState.baseSrc, jobId, { forceReload: true });
        }
        applyJunglePitch(semitone);
      }
    }

    async function ensureSoundtouchSupport() {
      if (!audio) return false;
      if (soundtouchState.setupPromise) return soundtouchState.setupPromise;

      const sourceUrl = soundtouchState.baseSrc;
      if (!sourceUrl) {
        soundtouchState.setupPromise = Promise.resolve(false);
        return soundtouchState.setupPromise;
      }

      soundtouchState.setupPromise = (async () => {
        try {
          const response = await fetch(sourceUrl);
          if (!response.ok) throw new Error(`Fetch failed with ${response.status}`);
          const arrayBuffer = await response.arrayBuffer();

          const decodeCtx = new AudioContextCtor();
          const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
          soundtouchState.audioBuffer = audioBuffer;
          await decodeCtx.close().catch(() => {});

          soundtouchState.module = await import("./assets_jamigo/soundtouch.js");
          return true;
        } catch (err) {
          console.warn("SoundTouch unavailable, using Jungle fallback", err);
          return false;
        }
      })();

      return soundtouchState.setupPromise;
    }

    async function applySoundTouchPitch(semitone, jobId) {
      if (!soundtouchState.audioBuffer || !soundtouchState.module) return;

      let targetUrl = soundtouchState.baseSrc;
      if (semitone !== 0) {
        targetUrl = await ensureRenderedPitchUrl(semitone, jobId);
      }
      if (jobId !== pitchJobId) return;
      await swapAudioSource(targetUrl, jobId);
      appliedSemitone = semitone;
    }

    async function ensureRenderedPitchUrl(semitone, jobId) {
      if (soundtouchState.cache.has(semitone)) {
        return soundtouchState.cache.get(semitone).url;
      }

      const { SoundTouch, SimpleFilter, WebAudioBufferSource } = soundtouchState.module;
      const source = new WebAudioBufferSource(soundtouchState.audioBuffer);
      source.position = 0;

      const soundTouch = new SoundTouch();
      soundTouch.pitchSemitones = semitone;
      soundTouch.tempo = 1;
      soundTouch.rate = 1;

      const filter = new SimpleFilter(source, soundTouch);
      const channelCount = soundtouchState.audioBuffer.numberOfChannels > 1 ? 2 : 1;
      const chunkLists = Array.from({ length: channelCount }, () => []);
      const bufferSize = 4096;
      const sampleBuffer = new Float32Array(bufferSize * 2);

      let framesExtracted;
      let lastYield = performance.now();

      do {
        framesExtracted = filter.extract(sampleBuffer, bufferSize);
        if (framesExtracted > 0) {
          if (channelCount === 1) {
            const monoChunk = new Float32Array(framesExtracted);
            for (let i = 0; i < framesExtracted; i += 1) {
              monoChunk[i] = sampleBuffer[i * 2];
            }
            chunkLists[0].push(monoChunk);
          } else {
            const leftChunk = new Float32Array(framesExtracted);
            const rightChunk = new Float32Array(framesExtracted);
            for (let i = 0; i < framesExtracted; i += 1) {
              leftChunk[i] = sampleBuffer[i * 2];
              rightChunk[i] = sampleBuffer[i * 2 + 1];
            }
            chunkLists[0].push(leftChunk);
            chunkLists[1].push(rightChunk);
          }

          if (performance.now() - lastYield > 24) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
            lastYield = performance.now();
          }
        }
      } while (framesExtracted > 0 && jobId === pitchJobId);

      if (jobId !== pitchJobId) {
        return soundtouchState.baseSrc;
      }

      const channelData = chunkLists.map((chunks) => {
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const combined = new Float32Array(totalLength);
        let offset = 0;
        chunks.forEach((chunk) => {
          combined.set(chunk, offset);
          offset += chunk.length;
        });
        return combined;
      });

      if (!channelData[0].length) {
        return soundtouchState.baseSrc;
      }

      const wavBuffer = encodeToWav(channelData, soundtouchState.audioBuffer.sampleRate);
      const blob = new Blob([wavBuffer], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      soundtouchState.cache.set(semitone, { url, blob });
      return url;
    }

    async function swapAudioSource(targetUrl, jobId, { forceReload = false } = {}) {
      if (!audio || jobId !== pitchJobId || !targetUrl) return;
      const resolvedTarget = targetUrl;
      const sameSrc = audio.src === resolvedTarget || (!forceReload && audio.currentSrc === resolvedTarget);
      if (sameSrc) return;

      const wasPlaying = !audio.paused && !audio.ended;
      const previousTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const previousRate = audio.playbackRate;

      audio.pause();
      audio.src = resolvedTarget;
      audio.load();
      await waitForMetadata(audio);
      audio.playbackRate = previousRate;

      const safeTime = Math.min(previousTime, Number.isFinite(audio.duration) && audio.duration ? Math.max(audio.duration - 0.2, 0) : previousTime);
      if (safeTime > 0 && Number.isFinite(safeTime)) {
        try {
          audio.currentTime = safeTime;
        } catch {}
      }

      if (wasPlaying) {
        audio.play().catch(() => {});
      }
    }

    function applyJunglePitch(semitone) {
      if (!canUseJungle || !audio) return;

      const effect = ensureJungleGraph();
      if (!effect) return;

      if (semitone === 0) {
        jungleState.dryGain.gain.setTargetAtTime(1, jungleState.audioCtx.currentTime, 0.015);
        jungleState.pitchedGain.gain.setTargetAtTime(0, jungleState.audioCtx.currentTime, 0.015);
        appliedSemitone = 0;
        return;
      }

      jungleState.dryGain.gain.setTargetAtTime(0, jungleState.audioCtx.currentTime, 0.015);
      jungleState.pitchedGain.gain.setTargetAtTime(1, jungleState.audioCtx.currentTime, 0.015);

      const direction = semitone > 0 ? 1 : -1;
      const targetRatio = Math.pow(2, semitone / 12);
      const baseDelay = typeof Jungle.BASE_DELAY_TIME === "number" ? Jungle.BASE_DELAY_TIME : 0.1;
      const denom = 5 * baseDelay;
      const pitchMultiplier = denom > 0 ? Math.abs(targetRatio - 1) / denom : 0;
      effect.setPitchOffset(direction * pitchMultiplier);
      appliedSemitone = semitone;
    }

    function ensureJungleGraph() {
      if (jungleState.audioCtx) return jungleState.effect;
      if (!canUseJungle || !audio) return null;

      try {
        jungleState.audioCtx = new AudioContextCtor();
      } catch (err) {
        console.error("Jamigo player: unable to create AudioContext", err);
        return null;
      }

      jungleState.mediaSource = jungleState.audioCtx.createMediaElementSource(audio);
      jungleState.dryGain = jungleState.audioCtx.createGain();
      jungleState.pitchedGain = jungleState.audioCtx.createGain();
      jungleState.pitchedGain.gain.value = 0;

      jungleState.effect = new Jungle(jungleState.audioCtx);

      jungleState.mediaSource.connect(jungleState.dryGain);
      jungleState.dryGain.connect(jungleState.audioCtx.destination);

      jungleState.mediaSource.connect(jungleState.effect.input);
      jungleState.effect.output.connect(jungleState.pitchedGain);
      jungleState.pitchedGain.connect(jungleState.audioCtx.destination);

      return jungleState.effect;
    }

    function resumeJungleContext() {
      if (!jungleState.audioCtx) return;
      if (jungleState.audioCtx.state === "suspended") {
        jungleState.audioCtx.resume().catch(() => {});
      }
    }

    function updatePitchUI() {
      if (!pitchReadout) return;
      const prefix = currentSemitone > 0 ? "+" : "";
      pitchReadout.textContent = `Pitch: ${prefix}${currentSemitone} sem`;

      if (pitchSlider && pitchSlider.value !== String(currentSemitone)) {
        pitchSlider.value = String(currentSemitone);
      }

      if (pitchDownBtn) {
        pitchDownBtn.disabled = currentSemitone <= PITCH_MIN;
        toggleInactive(pitchDownBtn, pitchDownBtn.disabled);
      }
      if (pitchUpBtn) {
        pitchUpBtn.disabled = currentSemitone >= PITCH_MAX;
        toggleInactive(pitchUpBtn, pitchUpBtn.disabled);
      }
      if (pitchResetBtn) {
        const disabled = currentSemitone === 0;
        pitchResetBtn.disabled = disabled;
        toggleInactive(pitchResetBtn, disabled);
      }
    }

    function setProcessingPitch(active) {
      if (!pitchStatus) return;
      if (active) {
        pitchStatus.classList.remove("visually-hidden");
      } else {
        pitchStatus.classList.add("visually-hidden");
      }
    }

    function cleanupPitchCache() {
      soundtouchState.cache.forEach((entry) => {
        if (entry?.url && entry.url.startsWith("blob:")) {
          URL.revokeObjectURL(entry.url);
        }
      });
      soundtouchState.cache.clear();
    }

    function waitForMetadata(element) {
      if (!element) return Promise.resolve();
      if (element.readyState >= 1) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const onLoaded = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error("Audio metadata load failed"));
        };
        const cleanup = () => {
          element.removeEventListener("loadedmetadata", onLoaded);
          element.removeEventListener("error", onError);
        };
        element.addEventListener("loadedmetadata", onLoaded, { once: true });
        element.addEventListener("error", onError, { once: true });
      });
    }

    function encodeToWav(channelData, sampleRate) {
      const channelCount = channelData.length;
      const frames = channelData[0]?.length || 0;
      const bytesPerSample = 2;
      const blockAlign = channelCount * bytesPerSample;
      const byteRate = sampleRate * blockAlign;
      const dataSize = frames * blockAlign;
      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);

      let offset = 0;
      function writeString(str) {
        for (let i = 0; i < str.length; i += 1) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
        offset += str.length;
      }
      function writeUint32(value) {
        view.setUint32(offset, value, true);
        offset += 4;
      }
      function writeUint16(value) {
        view.setUint16(offset, value, true);
        offset += 2;
      }

      writeString("RIFF");
      writeUint32(36 + dataSize);
      writeString("WAVE");
      writeString("fmt ");
      writeUint32(16);
      writeUint16(1);
      writeUint16(channelCount);
      writeUint32(sampleRate);
      writeUint32(byteRate);
      writeUint16(blockAlign);
      writeUint16(bytesPerSample * 8);
      writeString("data");
      writeUint32(dataSize);

      channelData.forEach((channelArray, channelIndex) => {
        if (channelArray.length !== frames) {
          throw new Error("Channel length mismatch in WAV encoding");
        }
      });

      for (let i = 0; i < frames; i += 1) {
        for (let channel = 0; channel < channelCount; channel += 1) {
          const sample = Math.max(-1, Math.min(1, channelData[channel][i] || 0));
          const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          view.setInt16(offset, intSample, true);
          offset += 2;
        }
      }

      return buffer;
    }

    function toggleInactive(btn, shouldAdd) {
      if (!btn) return;
      if (shouldAdd) {
        btn.classList.add("inactive");
      } else {
        btn.classList.remove("inactive");
      }
    }

    function clampPitch(value) {
      if (!Number.isFinite(value)) return 0;
      if (value > PITCH_MAX) return PITCH_MAX;
      if (value < PITCH_MIN) return PITCH_MIN;
      return value;
    }
  });
})();
