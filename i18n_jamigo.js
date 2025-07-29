// i18n_jamigo.js
// Minimal i18n with placeholders {name}, {instrument}, {Instrument}.

const JAMIGO_I18N = (() => {
  const dict = {
    en: {
      // Language page
      choose_language_title: "Choose Your Language",

      // Registration
      registration_title: "Create your Jamigo name",
      registration_continue: "Continue",
      registration_error_empty: "Please enter a name.",

      // Instrument page
      instrument_heading: "Hi {name}! What instrument do you play?",
      guitar: "Guitar",
      drums: "Drums",
      piano: "Piano",
      vocals: "Vocals",
      bass: "Bass",
      band: "Whole band",
      continue: "Continue",

      // Upload page
      upload_heading: "Welcome back, {name}! Ready to jam on {Instrument}?",
      upload_button: "Upload a Song",
      drag_hint: "or drag & drop a file here…",
      formats: "Supported formats: .mp3, .wav, .flac, .aiff",
      back: "Back",
    },

    it: {
      // Pagina lingua
      choose_language_title: "Scegli la lingua",

      // Registrazione
      registration_title: "Crea il tuo nome Jamigo",
      registration_continue: "Continua",
      registration_error_empty: "Per favore, inserisci un nome.",

      // Strumenti
      instrument_heading: "Ciao {name}! Quale strumento suoni?",
      guitar: "Chitarra",
      drums: "Batteria",
      piano: "Pianoforte",
      vocals: "Voce",
      bass: "Basso",
      band: "Tutta la Band",
      continue: "Continua",

      articles: {
        guitar: "la",
        drums: "la",
        piano: "il",
        vocals: "la",
        bass: "il",
        band: "la",
      },

      // Upload
      upload_heading: "Fantastico, {name}! Carica un brano per suonare con {article} {Instrument}",
      upload_button: "Carica un brano",
      drag_hint: "oppure trascina e rilascia un file qui…",
      formats: "Formati supportati: .mp3, .wav, .flac, .aiff",
      back: "Indietro",
    },
  };

  function getLang() {
    // read stored language or default to English
    const saved = localStorage.getItem("jamigo_lang") || "en";
    return saved in dict ? saved : "en";
  }

  function translateDom(root = document) {
    const lang = getLang();
    const table = dict[lang] || dict.en;

    // Build default placeholders (name + instrument label)
    const name = localStorage.getItem("jamigo_username") || "friend";
    const code = localStorage.getItem("jamigo_instrument") || "";
    const label = (table[code] || dict.en[code] || code || "instrument");
    const article = (table.articles && table.articles[code]) || "";

    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      let str = (table[key] || dict.en[key] || key);

      // Replace placeholders
      str = str
        .replaceAll("{name}", name)
        .replaceAll("{Instrument}", label)     // capitalized label from dict (as provided)
        .replaceAll("{instrument}", label.toLowerCase())
        .replaceAll("{article}", article);

      if (el.getAttribute("data-i18n-html") === "true") {
        el.innerHTML = str;
      } else {
        el.textContent = str;
      }
    });
  }

  return { translateDom };
})();

document.addEventListener("DOMContentLoaded", () => {
  JAMIGO_I18N.translateDom(document);
});