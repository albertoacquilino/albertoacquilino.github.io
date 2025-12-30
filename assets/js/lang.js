const SUPPORTED_LANGUAGES = ["en", "it", "fr"];
const PREFERRED_LANGUAGE_KEY = "preferredLanguage";

function sanitizeLanguage(lang) {
  if (!lang) return null;
  const normalized = lang.toLowerCase().split("-")[0];
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : null;
}

function getStoredPreferredLanguage() {
  try {
    return sanitizeLanguage(localStorage.getItem(PREFERRED_LANGUAGE_KEY));
  } catch (error) {
    return null;
  }
}

function inferBrowserLanguage() {
  const navigatorLanguages = [];
  if (typeof navigator !== "undefined") {
    if (Array.isArray(navigator.languages)) {
      navigatorLanguages.push(...navigator.languages);
    }
    if (navigator.language) {
      navigatorLanguages.push(navigator.language);
    }
  }

  for (const lang of navigatorLanguages) {
    const valid = sanitizeLanguage(lang);
    if (valid && valid !== "en") {
      return valid;
    }
  }

  return "en";
}

function getPreferredLanguage() {
  return getStoredPreferredLanguage() || inferBrowserLanguage();
}

function getCurrentLangFromPath(pathname = window.location.pathname) {
  const segments = pathname.split("/").filter(Boolean);
  const candidate = segments[0];
  if (SUPPORTED_LANGUAGES.includes(candidate)) {
    return candidate;
  }
  return getPreferredLanguage();
}

function getCurrentSlug(pathname = window.location.pathname) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "index.html";

  if (SUPPORTED_LANGUAGES.includes(segments[0])) {
    segments.shift();
  }

  let slug = segments.pop() || "index.html";

  if (slug.endsWith("/")) {
    slug = "index.html";
  } else if (!slug.includes(".")) {
    slug = `${slug}.html`;
  }

  return slug || "index.html";
}

function buildLangUrl(lang) {
  const targetLang = sanitizeLanguage(lang) || "en";
  const slug = getCurrentSlug();
  const search = typeof window !== "undefined" ? window.location.search : "";
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  return `/${targetLang}/${slug}${search || ""}${hash || ""}`;
}

function setPreferredLanguage(lang) {
  const targetLang = sanitizeLanguage(lang) || "en";
  try {
    localStorage.setItem(PREFERRED_LANGUAGE_KEY, targetLang);
  } catch (error) {
    // Ignore storage errors (private mode, etc.)
  }
  window.location.href = buildLangUrl(targetLang);
}

const LANG_LABELS = {
  en: "English",
  it: "Italiano",
  fr: "Français",
};

function closeLangMenu() {
  const switcher = document.querySelector(".language-switcher");
  if (!switcher) return;
  switcher.classList.remove("open");
  const toggle = switcher.querySelector(".lang-toggle");
  if (toggle) {
    toggle.setAttribute("aria-expanded", "false");
  }
}

function toggleLangMenu() {
  const switcher = document.querySelector(".language-switcher");
  if (!switcher) return;
  const isOpen = switcher.classList.toggle("open");
  const toggle = switcher.querySelector(".lang-toggle");
  if (toggle) {
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }
}

function setLangToggleLabel(lang) {
  const normalized = sanitizeLanguage(lang) || "en";
  const labelEl = document.querySelector("[data-lang-label]");
  if (labelEl) {
    labelEl.textContent = normalized.toUpperCase();
    const title = LANG_LABELS[normalized];
    if (title) {
      labelEl.setAttribute("aria-label", title);
    }
  }
  const flagEl = document.querySelector("[data-lang-flag]");
  if (flagEl) {
    flagEl.classList.remove("flag-en", "flag-it", "flag-fr");
    flagEl.classList.add(`flag-${normalized}`);
  }
}

function setActiveLanguageOption(lang) {
  const normalized = sanitizeLanguage(lang) || "en";
  document.querySelectorAll("[data-lang-option]").forEach((btn) => {
    const isActive = btn.getAttribute("data-lang-option") === normalized;
    btn.classList.toggle("active", isActive);
    if (isActive) {
      btn.setAttribute("aria-current", "page");
    } else {
      btn.removeAttribute("aria-current");
    }
  });

  setLangToggleLabel(normalized);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!getStoredPreferredLanguage()) {
    const inferred = inferBrowserLanguage();
    try {
      localStorage.setItem(PREFERRED_LANGUAGE_KEY, inferred);
    } catch (error) {
      // Ignore storage errors (private mode, etc.)
    }
  }

  setActiveLanguageOption(getCurrentLangFromPath());
});

document.addEventListener("click", (event) => {
  const switcher = document.querySelector(".language-switcher");
  if (!switcher) return;
  if (!switcher.contains(event.target)) {
    closeLangMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLangMenu();
  }
});
