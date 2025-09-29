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

    // ── Pitch shift controls (±1 semitone) ──────────────────────
    const pitchReadout = document.getElementById("pitch-readout");
    const pitchDownBtn = document.getElementById("pitch-down");
    const pitchResetBtn = document.getElementById("pitch-reset");
    const pitchUpBtn = document.getElementById("pitch-up");

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    const canPitchShift = typeof Jungle === "function" && typeof AudioContextCtor === "function";
    const PITCH_STORAGE_KEY = "jamigo_pitch_semitone";
    const SEMITONE_STEP = 1;

    let storedSemitone = parseInt(localStorage.getItem(PITCH_STORAGE_KEY) || "0", 10);
    if (Number.isNaN(storedSemitone)) storedSemitone = 0;
    let currentSemitone = clampPitch(storedSemitone);

    let audioCtx;
    let mediaSource;
    let dryGain;
    let pitchedGain;
    let jungle;

    if (pitchReadout && pitchDownBtn && pitchResetBtn && pitchUpBtn) {
      if (!canPitchShift) {
        pitchReadout.textContent = "Pitch: unavailable";
        [pitchDownBtn, pitchResetBtn, pitchUpBtn].forEach((btn) => {
          btn.disabled = true;
          btn.classList.add("inactive");
        });
      } else {
        updatePitchUI();

        pitchDownBtn.addEventListener("click", () => {
          applyPitchShift(currentSemitone - SEMITONE_STEP);
        });

        pitchResetBtn.addEventListener("click", () => {
          applyPitchShift(0);
        });

        pitchUpBtn.addEventListener("click", () => {
          applyPitchShift(currentSemitone + SEMITONE_STEP);
        });

        audio?.addEventListener("play", resumeContextIfNeeded);

        if (currentSemitone !== 0) {
          applyPitchShift(currentSemitone, { skipPersist: true });
        } else {
          updatePitchUI();
        }
      }
    }

    function applyPitchShift(nextSemitone, { skipPersist = false } = {}) {
      if (!canPitchShift || !audio) return;

      currentSemitone = clampPitch(nextSemitone);
      if (!skipPersist) {
        localStorage.setItem(PITCH_STORAGE_KEY, String(currentSemitone));
      }
      updatePitchUI();

      if (!ensureAudioGraph()) return;
      resumeContextIfNeeded();

      if (currentSemitone === 0) {
        dryGain.gain.setTargetAtTime(1, audioCtx.currentTime, 0.015);
        pitchedGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.015);
        return;
      }

      dryGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.015);
      pitchedGain.gain.setTargetAtTime(1, audioCtx.currentTime, 0.015);

      const ratio = Math.pow(2, Math.abs(currentSemitone) / 12);
      const direction = currentSemitone > 0 ? 1 : -1;
      jungle.setPitchOffset(direction * ratio);
    }

    function updatePitchUI() {
      if (!pitchReadout) return;
      const prefix = currentSemitone > 0 ? "+" : "";
      pitchReadout.textContent = `Pitch: ${prefix}${currentSemitone} sem`;

      if (pitchDownBtn) {
        pitchDownBtn.disabled = currentSemitone <= -SEMITONE_STEP;
        toggleInactive(pitchDownBtn, pitchDownBtn.disabled);
      }
      if (pitchUpBtn) {
        pitchUpBtn.disabled = currentSemitone >= SEMITONE_STEP;
        toggleInactive(pitchUpBtn, pitchUpBtn.disabled);
      }
      if (pitchResetBtn) {
        const disabled = currentSemitone === 0;
        pitchResetBtn.disabled = disabled;
        toggleInactive(pitchResetBtn, disabled);
      }
    }

    function toggleInactive(btn, shouldAdd) {
      if (!btn) return;
      if (shouldAdd) {
        btn.classList.add("inactive");
      } else {
        btn.classList.remove("inactive");
      }
    }

    function ensureAudioGraph() {
      if (audioCtx || !audio) return Boolean(audioCtx);
      if (!canPitchShift) return false;

      try {
        audioCtx = new AudioContextCtor();
      } catch (err) {
        console.error("Jamigo player: unable to create AudioContext", err);
        return false;
      }

      mediaSource = audioCtx.createMediaElementSource(audio);
      dryGain = audioCtx.createGain();
      pitchedGain = audioCtx.createGain();
      pitchedGain.gain.value = 0;

      jungle = new Jungle(audioCtx);

      mediaSource.connect(dryGain);
      dryGain.connect(audioCtx.destination);

      mediaSource.connect(jungle.input);
      jungle.output.connect(pitchedGain);
      pitchedGain.connect(audioCtx.destination);

      return true;
    }

    function resumeContextIfNeeded() {
      if (!audioCtx) return;
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }
    }

    function clampPitch(value) {
      if (!Number.isFinite(value)) return 0;
      if (value > SEMITONE_STEP) return SEMITONE_STEP;
      if (value < -SEMITONE_STEP) return -SEMITONE_STEP;
      return value;
    }
  });
})();
