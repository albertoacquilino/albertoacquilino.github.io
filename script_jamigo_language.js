/**
 * Jamigo – Language selector logic
 * Stores choice in localStorage, then redirects.
 */
(function () {
  const STORAGE_KEY = "jamigo_lang";
  const DEFAULT_NEXT_PAGE = "portfolio_jamigo_registration.html";

  /** Skip picker if language already chosen.
   * If the user has ALSO created a username, jump straight to the instrument picker.
   * Otherwise, go to the registration page.
   */
  const savedLang  = localStorage.getItem(STORAGE_KEY);
  const savedName  = localStorage.getItem("jamigo_username");

  if (savedLang && savedName) {
    document.documentElement.lang = savedLang;
    window.location.href = "portfolio_jamigo_instrument.html";
    return;
  }

  if (savedLang) {
    document.documentElement.lang = savedLang;
    window.location.href = DEFAULT_NEXT_PAGE;  // registration step
    return;
  }

  /** Wire language buttons */
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang"); // "en" or "it"
      localStorage.setItem("jamigo_lang", lang);
      document.documentElement.lang = lang;
      window.location.href = "registration_jamigo.html"; // or your next page
    });
  });
})();