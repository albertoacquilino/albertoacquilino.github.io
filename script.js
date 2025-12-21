function toggleImageSize(image) {
  image.classList.toggle("expanded");
}

document.addEventListener("DOMContentLoaded", function () {
  const video = document.querySelector(".input-video video");

  if (video) {
    let playCount = 0;

    video.addEventListener("ended", function () {
      playCount++;
      if (playCount >= 2) { // Stops after 2 loops
        video.pause();
      } else {
        video.play();
      }
    });
  }
});

function toggleMobileMenu() {
  const menu = document.getElementById("menu");
  if (!menu) return;
  menu.classList.toggle("show-mobile");
  const isOpen = menu.classList.contains("show-mobile");
  const toggle = document.querySelector(".hamburger");
  if (toggle) {
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }
}

function syncNavOffset() {
  const nav = document.querySelector("nav");
  if (!nav) return;
  const height = nav.offsetHeight;
  document.documentElement.style.setProperty("--nav-height", `${height}px`);
  document.body.style.paddingTop = `calc(${height}px + 0.25rem)`;
}

window.addEventListener("load", syncNavOffset);
window.addEventListener("resize", syncNavOffset);
