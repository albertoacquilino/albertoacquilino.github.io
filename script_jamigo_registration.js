/**
 * Jamigo – Registration page
 * Requires a non-empty username, then moves on to instrument picker.
 */
(function () {
  const form        = document.getElementById("reg-form");
  const input       = document.getElementById("username");
  const btnContinue = document.getElementById("reg-continue");
  const errorMsg    = document.getElementById("error-msg");

  // Enable the button when something is typed
  input.addEventListener("input", () => {
    btnContinue.disabled = input.value.trim().length === 0;
    errorMsg.textContent = "";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) {
      errorMsg.textContent = "Please enter a name.";
      return;
    }
    localStorage.setItem("jamigo_username", name);
    window.location.href = "portfolio_jamigo_instrument.html";
  });
})();