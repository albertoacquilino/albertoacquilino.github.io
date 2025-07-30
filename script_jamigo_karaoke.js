// script_jamigo_action.js
(function () {
  // personalize titles via i18n (already handled by i18n_jamigo.js)

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
      // TODO: navigate to processing page
      window.location.href = "processing_jamigo.html";
    });
  }

  if (karaokeBtn) {
    karaokeBtn.addEventListener("click", () => {
      localStorage.setItem("jamigo_action", "karaoke"); // remove the instrument
      window.location.href = "processing_jamigo.html";
    });
  }
})();