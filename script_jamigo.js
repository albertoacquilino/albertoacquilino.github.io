// script_jamigo.js
const chooseBtn = document.getElementById('choose-btn');
const fileInput = document.getElementById('file-input');
const fileName  = document.getElementById('file-name');

chooseBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  if (fileInput.files.length) {
    fileName.textContent = `Selected: ${fileInput.files[0].name}`;
    // TODO: hand the File object to your separation API
  }
});