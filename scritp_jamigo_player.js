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
  });
})();