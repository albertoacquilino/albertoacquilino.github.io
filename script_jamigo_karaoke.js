// script_jamigo_action.js
(function () {
  // personalize titles via i18n (already handled by i18n_jamigo.js)

  // Dynamically set the instrument icon
  document.addEventListener("DOMContentLoaded", () => {
    const instrument = localStorage.getItem("jamigo_instrument");
    const iconDiv = document.getElementById("action-icon");

    if (iconDiv && instrument) {
      const instrumentIcons = {
        guitar: "🎸",
        drums: "🥁",
        piano: "🎹",
        vocals: "🎤",
        bass: '<img src="assets_jamigo/bass.png" alt="Electric Bass" class="icon-img" />',
        band: "🎶"
      };

      iconDiv.innerHTML = instrumentIcons[instrument] || "🎵";
    }
  });

  // Click handlers
  const extractBtn = document.getElementById("card-extract");
  const karaokeBtn = document.getElementById("card-karaoke");
  const advToggle  = document.getElementById("advanced-toggle");
  const advPanel   = document.getElementById("advanced-panel");

  if (advToggle && advPanel) {
    advToggle.addEventListener("click", () => {
      const isHidden = advPanel.hasAttribute("hidden");
      if (isHidden) advPanel.removeAttribute("hidden");
      else advPanel.setAttribute("hidden", "");
    });
  }

  if (extractBtn) {
    extractBtn.addEventListener("click", () => {
      localStorage.setItem("jamigo_action", "extract"); // solo the instrument
      window.location.href = "portfolio_jamigo_player.html"; // temporary demo player page
    });
  }

  if (karaokeBtn) {
    karaokeBtn.addEventListener("click", () => {
      localStorage.setItem("jamigo_action", "karaoke"); // remove the instrument
      window.location.href = "portfolio_jamigo_player.html"; // temporary demo player page
    });
  }
})();