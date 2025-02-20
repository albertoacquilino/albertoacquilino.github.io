function toggleMobileMenu() {
  const navElement = document.querySelector("nav");
  navElement.classList.toggle("show-mobile");
}

function toggleImageSize(image) {
  image.classList.toggle("expanded");
}

function openFullscreen(img) {
  // Create an overlay
  let overlay = document.createElement("div");
  overlay.classList.add("overlay");
  overlay.onclick = closeFullscreen;

  // Clone the clicked image and make it fullscreen
  let fullscreenImg = img.cloneNode(true);
  fullscreenImg.classList.add("fullscreen");
  fullscreenImg.onclick = closeFullscreen; // Click again to close

  // Append elements to body
  document.body.appendChild(overlay);
  document.body.appendChild(fullscreenImg);

  // Show overlay
  overlay.style.display = "block";
}

function closeFullscreen() {
  // Remove the fullscreen image and overlay
  document.querySelector(".fullscreen").remove();
  document.querySelector(".overlay").remove();
}