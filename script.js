const loader = document.querySelector("[data-loader]");
const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navMenu = document.querySelector("[data-nav-menu]");
const heroSlides = Array.from(document.querySelectorAll(".hero__slide"));
const heroProgress = Array.from(document.querySelectorAll("[data-hero-progress] span"));
const particleCanvas = document.querySelector("[data-particles]");
const loaderCanvas = document.querySelector("[data-loader-particles]");
const cursorGlow = document.querySelector("[data-cursor-glow]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let currentSlide = 0;
let particles = [];
let loaderParticles = [];
let particleFrame = null;
let loaderFrame = null;

function hideLoader() {
  window.setTimeout(() => {
    loader.classList.add("is-hidden");
    document.body.classList.remove("is-locked");
    if (loaderFrame) cancelAnimationFrame(loaderFrame);
  }, 1050);
}

function setHeaderState() {
  header.classList.toggle("is-scrolled", window.scrollY > 18);
}

function toggleMenu() {
  const isOpen = navMenu.classList.toggle("is-open");
  navToggle.classList.toggle("is-active", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
}

function closeMenu() {
  navMenu.classList.remove("is-open");
  navToggle.classList.remove("is-active");
  navToggle.setAttribute("aria-expanded", "false");
}

function nextSlide() {
  heroSlides[currentSlide].classList.remove("is-active");
  heroProgress[currentSlide].classList.remove("is-active");
  currentSlide = (currentSlide + 1) % heroSlides.length;
  heroSlides[currentSlide].classList.add("is-active");
  heroProgress[currentSlide].classList.add("is-active");
}

function setupReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
  );

  document.querySelectorAll(".reveal").forEach((element, index) => {
    element.style.setProperty("--delay", `${Math.min(index * 36, 260)}ms`);
    observer.observe(element);
  });
}

function setupCounters() {
  const counters = Array.from(document.querySelectorAll("[data-counter]"));
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((counter) => observer.observe(counter));
}

function animateCounter(element) {
  const target = Number(element.dataset.counter);
  const isDecimal = String(element.dataset.counter).includes(".");
  const start = performance.now();
  const duration = 1300;

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target * eased;
    element.textContent = isDecimal ? value.toFixed(1) : Math.round(value);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function resizeCanvas(canvas, store, countDivider) {
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const count = Math.min(58, Math.floor(window.innerWidth / countDivider));
  store.length = 0;
  for (let index = 0; index < count; index += 1) {
    store.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: Math.random() * 1.25 + 0.28,
      speed: Math.random() * 0.18 + 0.055,
      drift: Math.random() * 0.18 - 0.09,
      alpha: Math.random() * 0.24 + 0.075,
      phase: Math.random() * Math.PI * 2
    });
  }
}

function drawParticles(canvas, store, frameSetter) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  store.forEach((particle) => {
    particle.y -= particle.speed;
    particle.x += particle.drift;
    particle.phase += 0.018;

    if (particle.y < -12) {
      particle.y = window.innerHeight + 12;
      particle.x = Math.random() * window.innerWidth;
    }

    if (particle.x < -12) particle.x = window.innerWidth + 12;
    if (particle.x > window.innerWidth + 12) particle.x = -12;

    const size = particle.radius * 5.4;
    const alpha = particle.alpha * (0.58 + Math.sin(particle.phase) * 0.18);
    const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, size);
    gradient.addColorStop(0, `rgba(241, 210, 138, ${alpha})`);
    gradient.addColorStop(0.36, `rgba(200, 169, 107, ${alpha * 0.45})`);
    gradient.addColorStop(1, "rgba(200, 169, 107, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
    ctx.fill();
  });

  frameSetter(requestAnimationFrame(() => drawParticles(canvas, store, frameSetter)));
}

function setupTilt() {
  if (prefersReducedMotion) return;

  document.querySelectorAll(".tilt-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-4px) rotateX(${y * -4}deg) rotateY(${x * 4.5}deg)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

function setupTimeSlots() {
  document.querySelectorAll(".time-slots button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".time-slots button").forEach((slot) => slot.classList.remove("is-selected"));
      button.classList.add("is-selected");
    });
  });
}

function updateParallax() {
  if (prefersReducedMotion) return;
  const offset = window.scrollY;
  document.documentElement.style.setProperty("--parallax-y", `${offset * 0.11}px`);
}

function setupCursorGlow() {
  if (!cursorGlow || prefersReducedMotion) return;

  window.addEventListener("pointermove", (event) => {
    cursorGlow.style.opacity = "1";
    cursorGlow.style.left = `${event.clientX}px`;
    cursorGlow.style.top = `${event.clientY}px`;
  });

  window.addEventListener("pointerleave", () => {
    cursorGlow.style.opacity = "0";
  });
}

document.body.classList.add("is-locked");
window.addEventListener("load", hideLoader);
window.setTimeout(hideLoader, 3200);

navToggle.addEventListener("click", toggleMenu);
navMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

window.addEventListener("scroll", () => {
  setHeaderState();
  updateParallax();
});

window.addEventListener("resize", () => {
  resizeCanvas(particleCanvas, particles, 34);
  resizeCanvas(loaderCanvas, loaderParticles, 42);
});

setupReveal();
setupCounters();
setupTilt();
setupTimeSlots();
setupCursorGlow();
setHeaderState();
resizeCanvas(particleCanvas, particles, 34);
resizeCanvas(loaderCanvas, loaderParticles, 42);

if (!prefersReducedMotion) {
  window.setInterval(nextSlide, 5200);
  drawParticles(particleCanvas, particles, (frame) => {
    particleFrame = frame;
  });
  drawParticles(loaderCanvas, loaderParticles, (frame) => {
    loaderFrame = frame;
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (particleFrame) cancelAnimationFrame(particleFrame);
    if (loaderFrame) cancelAnimationFrame(loaderFrame);
    particleFrame = null;
    loaderFrame = null;
    return;
  }

  if (!prefersReducedMotion && !particleFrame) {
    drawParticles(particleCanvas, particles, (frame) => {
      particleFrame = frame;
    });
  }
});
