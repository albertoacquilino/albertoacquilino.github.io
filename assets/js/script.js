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

document.addEventListener("DOMContentLoaded", () => {
  const carousels = document.querySelectorAll(".photo-carousel");

  carousels.forEach((carousel) => {
    const slides = Array.from(carousel.querySelectorAll(".photo-slide"));
    if (slides.length === 0) return;

    // Build dots
    const dotsWrap = document.createElement("div");
    dotsWrap.className = "carousel-dots";
    slides.forEach((_, dotIndex) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "carousel-dot";
      btn.setAttribute("aria-label", `Go to slide ${dotIndex + 1}`);
      btn.addEventListener("click", () => {
        setActive(dotIndex, true);
      });
      dotsWrap.appendChild(btn);
    });
    carousel.insertAdjacentElement("afterend", dotsWrap);

    let index = 0;
    let timerId = null;

    function setActive(nextIndex, fromUser = false) {
      slides[index].classList.remove("active");
      dotsWrap.children[index].classList.remove("active");
      index = nextIndex;
      slides[index].classList.add("active");
      dotsWrap.children[index].classList.add("active");
      if (fromUser) {
        restartTimer();
      }
    }

    function nextSlide() {
      const nextIndex = (index + 1) % slides.length;
      setActive(nextIndex);
    }

    function restartTimer() {
      if (timerId) clearInterval(timerId);
      timerId = setInterval(nextSlide, 7000);
    }

    setActive(0);
    restartTimer();
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const photoImages = document.querySelectorAll(".photo-card img");
  if (!photoImages.length) return;

  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.innerHTML = `
    <div class="lightbox-content">
      <button class="lightbox-close" aria-label="Close image viewer">×</button>
      <img alt="">
    </div>
  `;
  document.body.appendChild(overlay);

  const imgEl = overlay.querySelector("img");
  const closeBtn = overlay.querySelector(".lightbox-close");

  function close() {
    overlay.classList.remove("open");
  }

  function open(src, alt) {
    imgEl.src = src;
    imgEl.alt = alt || "";
    overlay.classList.add("open");
    closeBtn.focus();
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target === closeBtn) {
      close();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("open")) {
      close();
    }
  });

  photoImages.forEach((img) => {
    img.setAttribute("role", "button");
    img.setAttribute("tabindex", "0");
    img.addEventListener("click", () => open(img.src, img.alt));
    img.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open(img.src, img.alt);
      }
    });
  });
});
