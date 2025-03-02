function toggleImageSize(image) {
  image.classList.toggle("expanded");
}

document.addEventListener("DOMContentLoaded", function () {
  const video = document.querySelector(".input-video video");
  let playCount = 0;

  video.addEventListener("ended", function () {
      playCount++;
      if (playCount >= 2) { // Stops after 2 loops
          video.pause();
      } else {
          video.play();
      }
  });
});

function toggleMobileMenu() {
  const menu = document.getElementById("menu");
  menu.classList.toggle("show-mobile");
}