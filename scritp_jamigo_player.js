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
    const btns    = Array.from(document.querySelectorAll(".rate-btn"));

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

      // Large preset buttons
      btns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const rate = parseFloat(btn.getAttribute("data-rate"));
          setRate(rate, { updateUI: true });
        });
      });

      // Fine slider
      slider.addEventListener("input", () => {
        const rate = parseFloat(slider.value);
        setRate(rate, { updateUI: true, fromSlider: true });
      });

      function setRate(rate, { updateUI = false, fromSlider = false } = {}) {
        const clamped = clamp(rate, 0.25, 4);
        audio.playbackRate = clamped;
        localStorage.setItem("jamigo_playback_rate", String(clamped));
        readout.textContent = `Speed: ${clamped.toFixed(2)}×`;

        if (updateUI) {
          // Highlight the matching preset button
          btns.forEach((b) => b.classList.toggle(
            "active",
            Math.abs(parseFloat(b.dataset.rate) - clamped) < 0.001
          ));
          // Keep slider in sync unless it originated the change
          if (!fromSlider) slider.value = clamped;
        }
      }

      function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
      }
    }
  });
})();