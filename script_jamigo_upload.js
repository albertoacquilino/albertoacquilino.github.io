// script_jamigo_upload.js
(function () {
  // ─────────────────────────────────────────────────────────────
  // 1) personalised greeting
  // ─────────────────────────────────────────────────────────────
  const name       = localStorage.getItem("jamigo_username")   || "friend";
  const instrument = localStorage.getItem("jamigo_instrument") || "your instrument";
  const capInst    = instrument.charAt(0).toUpperCase() + instrument.slice(1);

  const greetingEl = document.getElementById("greeting");
  if (greetingEl) greetingEl.textContent =
      `Welcome back, ${name} — ready to jam on ${capInst}?`;

  // ─────────────────────────────────────────────────────────────
  // 2) drag-and-drop upload logic
  // ─────────────────────────────────────────────────────────────
  const dropArea  = document.getElementById("drop-area");
  const fileInput = document.getElementById("file-upload");

  // a. Highlight drop area on drag-over
  ["dragenter", "dragover"].forEach(evt =>
    dropArea.addEventListener(evt, (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      dropArea.classList.add("drag-over");
    })
  );

  // b. Remove highlight when the pointer leaves
  ["dragleave", "dragend", "drop"].forEach(evt =>
    dropArea.addEventListener(evt, () => dropArea.classList.remove("drag-over"))
  );

  // c. Handle actual drop
  dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // d. Fallback: click to open file dialog
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) {
      handleFile(fileInput.files[0]);
    }
  });

  // e. Placeholder handler (replace with real upload logic)
  function handleFile(file) {
    alert(`You selected: ${file.name}`);
    // TODO: send "file" to your separation API and show progress
  }
})();