(function () {
  const name = localStorage.getItem("jamigo_username");
  if (!name) {
    window.location.href = "registration_jamigo.html"; // fail-safe redirect
    return;
  }
  const span = document.getElementById("user-name");
  if (span) span.textContent = name;
})();

/**
 * Jamigo – Instrument picker
 * Saves choice, then forwards to the upload page.
 */
(function () {
  const buttons = document.querySelectorAll(".instrument-btn");
  const continueBtn = document.getElementById("continue-btn");
  let chosen = null;

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      chosen = btn.dataset.instrument;
      continueBtn.disabled = false;
    });
  });

  continueBtn.addEventListener("click", () => {
    if (!chosen) return;                 // `chosen` is the instrument the person clicked
    localStorage.setItem("jamigo_instrument", chosen);   // remember their instrument
    window.location.href = "portfolio_jamigo_upload.html";         // go to the upload page
});
})();