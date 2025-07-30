// script_jamigo_upload.js
(function () {
  

  // ─────────────────────────────────────────────────────────────
  // Drag-and-drop upload logic
  // ─────────────────────────────────────────────────────────────
  const dropArea  = document.getElementById("drop-area");
  const fileInput = document.getElementById("file-upload");

  // Prevent the browser from navigating when dropping files outside the drop-area
  ['dragover', 'drop'].forEach(evt =>
    window.addEventListener(evt, e => e.preventDefault())
  );

  // Guard: if elements are missing, stop here to avoid errors
  if (!dropArea || !fileInput) return;

  // Make the entire drop-area clickable to open the file dialog, with guard for label clicks
  dropArea.addEventListener('click', (e) => {
    // If the click originated on the <label for="file-upload">, let the label handle it
    if (e.target.closest('label')) return;
    fileInput.click();
  });

  // Create a small status line inside the drop-area to show the chosen file
  const statusEl = document.createElement('p');
  statusEl.className = 'upload-status';
  statusEl.setAttribute('aria-live', 'polite');
  dropArea.appendChild(statusEl);

  // Prevent label click from bubbling to dropArea and triggering a second click
  const uploadLabel = dropArea.querySelector('label[for="file-upload"]');
  if (uploadLabel) {
    uploadLabel.addEventListener('click', (e) => e.stopPropagation());
  }

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

  // e. Handle file selection and display status
  function handleFile(file) {
    // Accept common audio types & extensions
    const allowedExt = new Set(['mp3', 'wav', 'flac', 'aiff']);
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    if (!allowedExt.has(ext)) {
      statusEl.textContent = 'Unsupported file type. Please choose .mp3, .wav, .flac, or .aiff';
      return;
    }

    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    statusEl.textContent = `Selected: ${file.name} (${sizeMB} MB)`;
    // Remember selection and move to the Action Choice page
    localStorage.setItem('jamigo_file_name', file.name);
    fileInput.value = '';
    window.location.href = 'portfolio_jamigo_karaoke.html';

    // TODO: send "file" to your separation API and show progress
  }
})();