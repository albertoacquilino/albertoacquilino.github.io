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
    const transposeSlider  = document.getElementById("transpose-slider");
    const transposeReadout = document.getElementById("transpose-readout");

    const playToggle    = document.getElementById("play-toggle");
    const seekSlider    = document.getElementById("seek-slider");
    const volumeSlider  = document.getElementById("volume-slider");
    const muteToggle    = document.getElementById("mute-toggle");
    const currentTimeEl = document.getElementById("current-time");
    const durationEl    = document.getElementById("duration");

    const formatTime = (seconds) => {
      if (!Number.isFinite(seconds)) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
      return `${mins}:${secs}`;
    };

    const clampVolume = (value) => {
      if (!Number.isFinite(value)) return 1;
      return Math.max(0, Math.min(1, value));
    };

    const savedVolume = clampVolume(parseFloat(localStorage.getItem("jamigo_volume") || "1"));
    const savedMuted = localStorage.getItem("jamigo_muted") === "true";

    const transposeState = {
      current: 0,
      mediaSource: null,
      pitchNode: null,
      gainNode: null,
      initialized: false,
      userMuted: savedMuted,
      userVolume: savedVolume,
      lastNonZeroVolume: savedMuted ? 1 : savedVolume || 1,
      forceMuted: false,
    };

    const clampTranspose = (value) => Math.max(-5, Math.min(5, value));

    const updateTransposeReadout = (value) => {
      if (!transposeReadout) return;
      const prefix = value > 0 ? "+" : "";
      const suffix = Math.abs(value) === 1 ? "semitone" : "semitones";
      transposeReadout.textContent = `Transpose: ${prefix}${value} ${suffix}`;
    };

    const syncVolume = () => {
      if (!transposeState.gainNode) return;
      const effectiveVolume = transposeState.userMuted ? 0 : transposeState.userVolume;
      transposeState.gainNode.gain.value = effectiveVolume;
      localStorage.setItem("jamigo_volume", String(transposeState.userVolume));
      localStorage.setItem("jamigo_muted", String(transposeState.userMuted));
      if (volumeSlider && !volumeSlider.matches(":active")) {
        volumeSlider.value = transposeState.userMuted ? "0" : String(transposeState.userVolume);
      }
      if (muteToggle) {
        const icon = transposeState.userMuted ? "🔇" : "🔊";
        muteToggle.querySelector(".audio-icon").textContent = icon;
        muteToggle.setAttribute("aria-label", transposeState.userMuted ? "Unmute" : "Mute");
        muteToggle.querySelector(".visually-hidden").textContent = transposeState.userMuted ? "Unmute" : "Mute";
      }
    };

    const ensureToneGraph = async () => {
      if (!audio || !window.Tone) return false;
      if (!transposeState.mediaSource) {
        try {
          await Tone.start();
        } catch (err) {
          console.warn("Tone.js context start failed", err);
          return false;
        }

        const toneCtx = Tone.getContext();
        const rawCtx = toneCtx.rawContext;
        transposeState.mediaSource = rawCtx.createMediaElementSource(audio);
        transposeState.pitchNode = new Tone.PitchShift({ pitch: transposeState.current });
        transposeState.gainNode = new Tone.Gain(transposeState.userMuted ? 0 : transposeState.userVolume);

        Tone.connect(transposeState.mediaSource, transposeState.pitchNode);
        transposeState.pitchNode.connect(transposeState.gainNode);
        transposeState.gainNode.toDestination();

        audio.muted = true;
        transposeState.forceMuted = true;
      }

      transposeState.initialized = true;
      syncVolume();
      return true;
    };

    const applyTranspose = async (semitones, { fromSlider = false } = {}) => {
      const clamped = clampTranspose(semitones);
      transposeState.current = clamped;
      localStorage.setItem("jamigo_transpose", String(clamped));
      updateTransposeReadout(clamped);

      if (!fromSlider && transposeSlider) {
        transposeSlider.value = String(clamped);
      }

      if (!window.Tone) return;

      const initialized = await ensureToneGraph();
      if (initialized && transposeState.pitchNode) {
        transposeState.pitchNode.pitch = clamped;
      }
    };

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

    if (transposeSlider && transposeReadout) {
      if (!window.Tone) {
        transposeSlider.disabled = true;
        updateTransposeReadout(0);
      } else {
        const savedTranspose = parseInt(localStorage.getItem("jamigo_transpose") || "0", 10);
        applyTranspose(Number.isNaN(savedTranspose) ? 0 : savedTranspose);

        transposeSlider.addEventListener("input", async () => {
          const value = parseInt(transposeSlider.value, 10);
          await applyTranspose(Number.isNaN(value) ? 0 : value, { fromSlider: true });
        });

        if (audio) {
          audio.addEventListener("play", () => {
            ensureToneGraph().catch(() => {});
            updatePlayUI();
          });
          audio.addEventListener("pause", updatePlayUI);
          audio.addEventListener("ended", () => {
            updatePlayUI();
            setTimeout(() => { if (audio) audio.currentTime = 0; }, 0);
          });
        }
      }
    }

    const updatePlayUI = () => {
      if (!audio || !playToggle) return;
      const isPlaying = !audio.paused && !audio.ended;
      const iconSpan = playToggle.querySelector(".audio-icon");
      const labelSpan = playToggle.querySelector(".visually-hidden");
      iconSpan.textContent = isPlaying ? "❚❚" : "▶︎";
      const label = isPlaying ? "Pause" : "Play";
      playToggle.setAttribute("aria-label", label);
      labelSpan.textContent = label;
    };

    const updateTimeUI = () => {
      if (!audio) return;
      if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
      if (durationEl) durationEl.textContent = formatTime(audio.duration);
      if (seekSlider && !seekSlider.matches(":active")) {
        const progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        seekSlider.value = progress.toString();
      }
    };

    if (audio) {
      audio.addEventListener("loadedmetadata", updateTimeUI);
      audio.addEventListener("timeupdate", updateTimeUI);
    }

    if (playToggle && audio) {
      playToggle.addEventListener("click", async () => {
        if (audio.paused) {
          try {
            await audio.play();
          } catch (err) {
            console.warn("Audio play failed", err);
          }
        } else {
          audio.pause();
        }
        updatePlayUI();
      });
      updatePlayUI();
    }

    if (seekSlider && audio) {
      seekSlider.addEventListener("input", () => {
        if (!audio.duration) return;
        const target = (parseFloat(seekSlider.value) / 100) * audio.duration;
        if (currentTimeEl) currentTimeEl.textContent = formatTime(target);
      });
      seekSlider.addEventListener("change", () => {
        if (!audio.duration) return;
        const target = (parseFloat(seekSlider.value) / 100) * audio.duration;
        audio.currentTime = target;
      });
    }

    if (volumeSlider) {
      volumeSlider.addEventListener("input", () => {
        const value = clampVolume(parseFloat(volumeSlider.value));
        transposeState.userVolume = Number.isNaN(value) ? transposeState.userVolume : value;
        if (transposeState.userVolume > 0) {
          transposeState.lastNonZeroVolume = transposeState.userVolume;
          transposeState.userMuted = false;
        } else {
          transposeState.userMuted = true;
        }
        syncVolume();
      });
    }

    if (muteToggle) {
      muteToggle.addEventListener("click", () => {
        transposeState.userMuted = !transposeState.userMuted;
        if (!transposeState.userMuted && transposeState.lastNonZeroVolume > 0) {
          transposeState.userVolume = transposeState.lastNonZeroVolume;
        }
        syncVolume();
      });
    }

    updateTimeUI();
    syncVolume();
  });
})();
