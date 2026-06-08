const loader = document.querySelector("[data-loader]");
const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navMenu = document.querySelector("[data-nav-menu]");
const hero = document.querySelector("[data-parallax]");
const heroCarousel = document.querySelector("[data-hero-carousel]");
const canvas = document.querySelector("[data-particles]");
const ctx = canvas.getContext("2d");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const prefersTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
const mobilePerformanceQuery = window.matchMedia("(max-width: 768px)");
const shouldUseMobilePerformance = prefersTouch || mobilePerformanceQuery.matches;
const LOADER_MIN_TIME = prefersReducedMotion ? 1400 : 3200;
const LOADER_FORCE_READY_TIME = prefersReducedMotion ? 3000 : 5600;
const loaderStartedAt = Date.now();

let particles = [];
let particleFrame = null;
let heroSlideIndex = 0;
let heroSlideTimer = null;
let loaderHideTimer = null;

function hideLoader(delay = 0, force = false) {
  const baseDelay = Number.isFinite(delay) ? delay : 0;
  const elapsed = Date.now() - loaderStartedAt;
  const remainingMinTime = Math.max(0, LOADER_MIN_TIME - elapsed);
  const timeout = force ? baseDelay : Math.max(baseDelay, remainingMinTime);

  if (document.body.classList.contains("is-ready")) return;
  if (loaderHideTimer && !force) return;
  if (loaderHideTimer && force) window.clearTimeout(loaderHideTimer);

  loaderHideTimer = window.setTimeout(() => {
    if (loader) loader.classList.add("is-hidden");
    document.body.classList.remove("is-locked");
    document.body.classList.add("is-ready");
    window.dispatchEvent(new CustomEvent("invictus:loader-ready"));
    loaderHideTimer = null;
  }, timeout);
}

function setHeaderState() {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}

function toggleMenu() {
  const isOpen = navMenu.classList.toggle("is-open");
  navToggle.classList.toggle("is-active", isOpen);
  document.body.classList.toggle("is-menu-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
}

function closeMenu() {
  navMenu.classList.remove("is-open");
  navToggle.classList.remove("is-active");
  document.body.classList.remove("is-menu-open");
  navToggle.setAttribute("aria-expanded", "false");
}

function setupReveal() {
  const heroMobileActions = document.querySelector(".hero .hero__content");
  const shouldShowHeroActionsImmediately = window.matchMedia("(max-width: 768px)").matches;

  if (heroMobileActions && shouldShowHeroActionsImmediately) {
    heroMobileActions.classList.add("is-visible");
    heroMobileActions.style.setProperty("--reveal-delay", "0ms");
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -10% 0px" }
  );

  document.querySelectorAll(".reveal").forEach((element) => {
    if (element === heroMobileActions && shouldShowHeroActionsImmediately) return;

    const scope = element.closest(".section, .hero, .footer") || document.body;
    const scopedItems = Array.from(scope.querySelectorAll(".reveal"));
    const index = scopedItems.indexOf(element);
    element.style.setProperty("--reveal-delay", `${Math.min(index * 72, 360)}ms`);
    observer.observe(element);
  });
}

function setupAccordion() {
  document.querySelectorAll(".service-panel__trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const panel = trigger.closest(".service-panel");
      const isOpen = panel.classList.contains("is-open");

      document.querySelectorAll(".service-panel").forEach((item) => {
        item.classList.remove("is-open");
        item.querySelector(".service-panel__trigger").setAttribute("aria-expanded", "false");
      });

      if (!isOpen) {
        panel.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });
  });
}

function setupSlots() {
  document.querySelectorAll(".mini-slots button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".mini-slots button").forEach((slot) => slot.classList.remove("is-selected"));
      button.classList.add("is-selected");
    });
  });
}

function setupTilt() {
  if (prefersReducedMotion || prefersTouch) return;

  document.querySelectorAll(".tilt-card").forEach((card) => {
    let frame = null;

    card.addEventListener("pointermove", (event) => {
      if (frame) cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        const x = px - 0.5;
        const y = py - 0.5;

        card.style.setProperty("--depth-pointer-x", `${px * 100}%`);
        card.style.setProperty("--depth-pointer-y", `${py * 100}%`);
        card.style.setProperty("--depth-tilt-x", `${y * -2.2}deg`);
        card.style.setProperty("--depth-tilt-y", `${x * 2.8}deg`);
        card.style.transform = `perspective(900px) translate3d(0, -4px, 0) rotateX(${y * -2.2}deg) rotateY(${x * 2.8}deg)`;
      });
    });

    card.addEventListener("pointerleave", () => {
      if (frame) cancelAnimationFrame(frame);
      frame = null;
      card.style.removeProperty("--depth-pointer-x");
      card.style.removeProperty("--depth-pointer-y");
      card.style.removeProperty("--depth-tilt-x");
      card.style.removeProperty("--depth-tilt-y");
      card.style.transform = "";
    });
  });
}

function setupHeroCarousel() {
  if (!heroCarousel || prefersReducedMotion) return;

  const slides = Array.from(heroCarousel.querySelectorAll(".hero-visual__slide"));
  if (slides.length < 2) return;

  heroSlideTimer = window.setInterval(() => {
    slides[heroSlideIndex].classList.remove("is-active");
    heroSlideIndex = (heroSlideIndex + 1) % slides.length;
    slides[heroSlideIndex].classList.add("is-active");
  }, 7200);
}

function updateParallax() {
  if (prefersReducedMotion || prefersTouch || !hero) return;
  hero.style.setProperty("--parallax-y", `${window.scrollY * 0.09}px`);
}

function setupHeroDepth() {
  if (prefersReducedMotion || prefersTouch || !hero) return;

  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    hero.style.setProperty("--hero-drift-x", `${x * 12}px`);
    hero.style.setProperty("--hero-drift-y", `${y * 8}px`);
    hero.style.setProperty("--depth-pointer-x", `${(x + 0.5) * 100}%`);
    hero.style.setProperty("--depth-pointer-y", `${(y + 0.5) * 100}%`);
  });

  hero.addEventListener("pointerleave", () => {
    hero.style.setProperty("--hero-drift-x", "0px");
    hero.style.setProperty("--hero-drift-y", "0px");
    hero.style.removeProperty("--depth-pointer-x");
    hero.style.removeProperty("--depth-pointer-y");
  });
}

function setupPremiumMouseInteractions() {
  if (prefersReducedMotion || prefersTouch) return;

  const reactiveSelector = [
    ".hero",
    ".footer",
    ".media-card",
    ".barber-card",
    ".gallery-item",
    ".hero-service",
    ".service-panel",
    ".location-card",
    ".booking-experience--concierge .booking-command",
    ".booking-experience--concierge .booking-screen",
    ".booking-experience--concierge .barber-select",
    ".booking-experience--concierge .service-category",
    ".booking-experience--concierge .booking-confirm-card"
  ].join(",");
  const magneticSelector = ".btn, .nav-cta, .footer__social, .ck-signature, .booking-final";
  let frame = null;
  let activeReactive = null;
  let activeMagnetic = null;

  function clearReactive() {
    if (!activeReactive) return;
    activeReactive.style.removeProperty("--premium-pointer-x");
    activeReactive.style.removeProperty("--premium-pointer-y");
    activeReactive = null;
  }

  function clearMagnetic() {
    if (!activeMagnetic) return;
    activeMagnetic.style.removeProperty("--magnet-x");
    activeMagnetic.style.removeProperty("--magnet-y");
    activeMagnetic = null;
  }

  document.addEventListener("pointermove", (event) => {
    const reactive = event.target.closest(reactiveSelector);
    const magnetic = event.target.closest(magneticSelector);

    if (!reactive) clearReactive();
    if (!magnetic) clearMagnetic();
    if (!reactive && !magnetic) return;

    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (reactive) {
        activeReactive = reactive;
        const rect = reactive.getBoundingClientRect();
        const px = ((event.clientX - rect.left) / rect.width) * 100;
        const py = ((event.clientY - rect.top) / rect.height) * 100;
        reactive.style.setProperty("--premium-pointer-x", `${Math.max(0, Math.min(100, px))}%`);
        reactive.style.setProperty("--premium-pointer-y", `${Math.max(0, Math.min(100, py))}%`);
      }

      if (magnetic && !magnetic.disabled) {
        activeMagnetic = magnetic;
        const rect = magnetic.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        magnetic.style.setProperty("--magnet-x", `${x * 5}px`);
        magnetic.style.setProperty("--magnet-y", `${y * 4}px`);
      }
    });
  });

  document.addEventListener("pointerleave", () => {
    clearReactive();
    clearMagnetic();
  });
}

function resizeCanvas() {
  if (shouldUseMobilePerformance) {
    particles = [];
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
      canvas.style.width = "1px";
      canvas.style.height = "1px";
    }
    return;
  }

  const ratio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const countDivider = prefersTouch ? 170 : 110;
  const count = Math.min(prefersTouch ? 6 : 12, Math.floor(window.innerWidth / countDivider));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    radius: Math.random() * 0.8 + 0.28,
    speed: Math.random() * 0.08 + 0.025,
    drift: Math.random() * 0.06 - 0.03,
    alpha: Math.random() * 0.08 + 0.025,
    phase: Math.random() * Math.PI * 2
  }));
}

function drawParticles() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  particles.forEach((particle) => {
    particle.y -= particle.speed;
    particle.x += particle.drift;
    particle.phase += 0.014;

    if (particle.y < -12) {
      particle.y = window.innerHeight + 12;
      particle.x = Math.random() * window.innerWidth;
    }

    if (particle.x < -12) particle.x = window.innerWidth + 12;
    if (particle.x > window.innerWidth + 12) particle.x = -12;

    const glow = particle.radius * 6;
    const alpha = particle.alpha * (0.68 + Math.sin(particle.phase) * 0.22);
    const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, glow);
    gradient.addColorStop(0, `rgba(242, 208, 138, ${alpha})`);
    gradient.addColorStop(0.42, `rgba(201, 156, 69, ${alpha * 0.42})`);
    gradient.addColorStop(1, "rgba(201, 156, 69, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, glow, 0, Math.PI * 2);
    ctx.fill();
  });

  particleFrame = requestAnimationFrame(drawParticles);
}

function setupExperienceVideo() {
  const frame = document.querySelector(".video-experience__frame");
  const video = frame?.querySelector(".video-experience__player");
  const backdrop = frame?.querySelector(".video-experience__backdrop");
  const playButton = frame?.querySelector(".video-experience__play");

  if (!frame || !video || !playButton) return;

  function syncPlayingState() {
    frame.classList.toggle("is-playing", !video.paused && !video.ended);

    if (!backdrop) return;

    if (video.paused || video.ended) {
      backdrop.pause();
      return;
    }

    backdrop.currentTime = video.currentTime;
    const backdropRequest = backdrop.play();
    if (backdropRequest) backdropRequest.catch(() => {});
  }

  playButton.addEventListener("click", () => {
    if (video.paused || video.ended) {
      const playRequest = video.play();
      if (playRequest) playRequest.catch(syncPlayingState);
      return;
    }

    video.pause();
  });

  video.addEventListener("play", syncPlayingState);
  video.addEventListener("pause", syncPlayingState);
  video.addEventListener("ended", syncPlayingState);
  video.addEventListener("seeked", () => {
    if (backdrop) backdrop.currentTime = video.currentTime;
  });
  syncPlayingState();
}

function setupBookingForm() {
  const form = document.querySelector("[data-booking-form]");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const message = [
      "Olá, quero agendar na Invictus Barber.",
      `Nome: ${data.get("nome")}`,
      `Serviço: ${data.get("servico")}`,
      `Dia: ${data.get("dia")}`,
      `Horário: ${data.get("horario")}`
    ].join("\n");

    window.open(`https://wa.me/5500000000000?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  });
}

document.body.classList.add("is-locked");
window.addEventListener("load", () => hideLoader());
window.setTimeout(() => hideLoader(0, true), LOADER_FORCE_READY_TIME);

navToggle.addEventListener("click", toggleMenu);
navMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

window.addEventListener("scroll", () => {
  setHeaderState();
  updateParallax();
});
window.addEventListener("resize", resizeCanvas);
window.addEventListener("resize", () => {
  if (window.innerWidth > 1024) closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

setupReveal();
setupAccordion();
setupSlots();
setupTilt();
setupHeroCarousel();
setupHeroDepth();
setupPremiumMouseInteractions();
setupExperienceVideo();
setupBookingForm();
setHeaderState();
resizeCanvas();

if (!prefersReducedMotion && !shouldUseMobilePerformance) {
  drawParticles();
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (particleFrame) cancelAnimationFrame(particleFrame);
    if (heroSlideTimer) window.clearInterval(heroSlideTimer);
    particleFrame = null;
    heroSlideTimer = null;
    return;
  }

  if (!prefersReducedMotion && !shouldUseMobilePerformance && !particleFrame) {
    drawParticles();
  }

  if (!prefersReducedMotion && !heroSlideTimer) {
    setupHeroCarousel();
  }
});
