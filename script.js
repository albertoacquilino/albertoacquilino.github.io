function toggleMobileMenu() {
  const navElement = document.querySelector("nav");
  navElement.classList.toggle("show-mobile");
}

function toggleImageSize(image) {
  image.classList.toggle("expanded");
}

document.addEventListener("DOMContentLoaded", function () {
  const video = document.querySelector(".input-video video");
  let playCount = 0;

  video.addEventListener("ended", function () {
      playCount++;
      if (playCount >= 3) { // Stops after 3 loops
          video.pause();
      } else {
          video.play();
      }
  });
});