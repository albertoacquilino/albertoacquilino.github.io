/**
 * Jamigo – Language selector logic
 * Stores choice in localStorage, then redirects.
 */
(function () {
  const STORAGE_KEY = "jamigo_lang";
  const DEFAULT_NEXT_PAGE = "instrument_jamigo.html";   // ← new target page

  /** Skip picker if language already chosen */
  const savedLang = localStorage.getItem(STORAGE_KEY);
  if (savedLang) {
    document.documentElement.lang = savedLang;
    window.location.href = DEFAULT_NEXT_PAGE;
    return;
  }

  /** Wire language buttons */
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
      window.location.href = DEFAULT_NEXT_PAGE;
    });
  });
})();