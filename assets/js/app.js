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

let particles = [];
let particleFrame = null;
let heroSlideIndex = 0;
let heroSlideTimer = null;
let loaderHideTimer = null;
let monkeyEggActive = false;

function hideLoader(delay = 3800, force = false) {
  const timeout = Number.isFinite(delay) ? delay : 3800;

  if (document.body.classList.contains("is-ready")) return;
  if (loaderHideTimer && !force) return;
  if (loaderHideTimer && force) window.clearTimeout(loaderHideTimer);

  loaderHideTimer = window.setTimeout(() => {
    loader.classList.add("is-hidden");
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

function setupCkTransition() {
  const signature = document.querySelector("[data-ck-signature]");
  if (!signature) return;
  let isTransitioning = false;

  const codeSnippets = [
    ["const STORAGE_KEY = 'invictus_barber_bookings';", "const stored = localStorage.getItem(STORAGE_KEY);", "return stored ? JSON.parse(stored) : [];"],
    ["async function saveBooking(booking) {", "  const bookings = await listBookings();", "  bookings.push(booking);", "}"],
    ["window.localStorage.setItem(", "  STORAGE_KEY,", "  JSON.stringify(bookings)", ");"],
    ["const storageAdapter = {", "  async listBookings() {", "    return JSON.parse(stored) || [];", "  }", "};"],
    ["try {", "  const stored = localStorage.getItem(STORAGE_KEY);", "} catch (error) {", "  console.warn('Storage error', error);", "}"],
    ["const booking = {", "  service: selectedService.name,", "  barber: selectedBarber.name,", "  date: selectedDate", "};"],
    ["document.querySelector('[data-booking-app]');", "button.classList.add('is-selected');", "status.dataset.type = 'success';"],
    ["function findBooking(predicate) {", "  return bookings.find(predicate) || null;", "}"],
    ["const payload = encodeURIComponent(message);", "window.open(`https://wa.me/${phone}?text=${payload}`);"],
    ["window.InvictusStorage = {", "  adapter: localStorageAdapter,", "  saveBooking(booking) {", "    return this.adapter.saveBooking(booking);", "  }", "};"]
  ];

  const draculaColors = [
    "#bd93f9",
    "#ff79c6",
    "#8be9fd",
    "#f8f8f2",
    "#6272a4",
    "#ffb86c",
    "#ff5555"
  ];

  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "ck-transition-loader";
    overlay.setAttribute("aria-hidden", "true");

    const codeLayerBack = document.createElement("div");
    codeLayerBack.className = "ck-transition-loader__code ck-transition-loader__code--back";

    const codeLayerFront = document.createElement("div");
    codeLayerFront.className = "ck-transition-loader__code ck-transition-loader__code--front";

    const streamCount = prefersReducedMotion ? 8 : prefersTouch ? 14 : 24;
    const particleCount = prefersReducedMotion ? 0 : prefersTouch ? 6 : 10;

    Array.from({ length: streamCount }).forEach((_, index) => {
      const stream = document.createElement("span");
      const lines = codeSnippets[index % codeSnippets.length];

      lines.join("\n").split("").slice(0, prefersTouch ? 42 : 56).forEach((char, charIndex) => {
        const item = document.createElement("b");
        item.textContent = char === " " ? "\u00a0" : char;
        item.style.setProperty("--token-delay", `${charIndex * 0.018}s`);
        item.style.setProperty("--code-color", draculaColors[(index + charIndex) % draculaColors.length]);
        stream.appendChild(item);
      });

      stream.style.setProperty("--x", `${8 + Math.random() * 84}%`);
      stream.style.setProperty("--delay", `${Math.random() * 0.28}s`);
      stream.style.setProperty("--duration", `${1.45 + Math.random() * 0.45}s`);
      stream.style.setProperty("--depth", `${0.74 + Math.random() * 0.46}`);
      stream.style.setProperty("--drift", `${-16 + Math.random() * 32}px`);
      (index % 4 === 0 ? codeLayerFront : codeLayerBack).appendChild(stream);
    });

    const particles = document.createElement("div");
    particles.className = "ck-transition-loader__particles";
    Array.from({ length: particleCount }).forEach((_, index) => {
      const particle = document.createElement("span");
      particle.style.setProperty("--x", `${Math.random() * 100}%`);
      particle.style.setProperty("--y", `${Math.random() * 100}%`);
      particle.style.setProperty("--size", `${2 + Math.random() * 4}px`);
      particle.style.setProperty("--delay", `${Math.random() * 1.8}s`);
      particle.style.setProperty("--duration", `${2.1 + Math.random() * 2.4}s`);
      particle.style.setProperty("--particle-color", draculaColors[index % draculaColors.length]);
      particles.appendChild(particle);
    });

    overlay.innerHTML = `
      <div class="ck-transition-loader__volumetric"></div>
      <div class="ck-transition-loader__aura"></div>
      <figure class="ck-transition-loader__entity">
        <span class="ck-transition-loader__shadow"></span>
        <img src="assets/img/codedby.ck-img.png" alt="" onerror="this.onerror=null; this.src='assets/img/codedby.ck-img.jpg';" />
      </figure>
      <div class="ck-transition-loader__copy">
        <strong>CODED BY CK</strong>
        <span>ENTERING DEV MODE</span>
      </div>
      <div class="ck-transition-loader__progress"></div>
    `;

    overlay.prepend(codeLayerBack);
    overlay.appendChild(particles);
    overlay.appendChild(codeLayerFront);
    document.body.appendChild(overlay);
    return overlay;
  }

  signature.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
    event.preventDefault();
    if (isTransitioning) return;
    isTransitioning = true;

    const target = signature.href;
    const overlay = createOverlay();

    requestAnimationFrame(() => overlay.classList.add("is-active"));
    window.setTimeout(() => overlay.classList.add("is-leaving"), prefersReducedMotion ? 650 : 1600);
    window.setTimeout(() => {
      overlay.remove();
      window.location.assign(target);
    }, prefersReducedMotion ? 900 : 2000);
  });
}

function setupMonkeyEasterEgg() {
  if (prefersReducedMotion) return;

  const bookingApp = document.querySelector("[data-booking-app]");
  const bookingSection = document.querySelector("#agenda");
  const monkeys = [
    { mood: "peek", flip: "1", scale: "1" },
    { mood: "dash", flip: "-1", scale: "0.94" },
    { mood: "hang", flip: "1", scale: "0.88" },
    { mood: "flip", flip: "-1", scale: "1.04" }
  ];
  const positions = ["bottom-right", "bottom-left", "side-right", "near-footer"];
  let monkeyIndex = 0;
  let positionIndex = 0;

  function elementInViewport(element, threshold = 0.18) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const visibleY = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    return visibleY > Math.min(rect.height, window.innerHeight) * threshold;
  }

  function bookingIsBusy() {
    if (!bookingApp) return false;
    const activeElement = document.activeElement;
    const hasFocus = activeElement && bookingApp.contains(activeElement);
    const hasSelection = Boolean(bookingApp.querySelector(".is-selected, .is-current"));
    const hasTypedField = Array.from(bookingApp.querySelectorAll("input")).some((input) => input.value.trim());
    return hasFocus || hasSelection || hasTypedField || elementInViewport(bookingSection, 0.24);
  }

  function cleanupMonkey(monkey) {
    if (!monkey || !monkey.isConnected) return;
    monkey.classList.add("is-leaving");
    window.setTimeout(() => {
      monkey.remove();
      monkeyEggActive = false;
    }, 640);
  }

  function showMonkey(force = false) {
    if (monkeyEggActive || document.hidden || document.body.classList.contains("is-locked")) return;
    if (!force && bookingIsBusy()) return;

    monkeyEggActive = true;
    const monkeyData = monkeys[monkeyIndex % monkeys.length];
    const position = positions[positionIndex % positions.length];
    monkeyIndex += 1;
    positionIndex += 1;

    const monkey = document.createElement("button");
    monkey.className = `monkey-egg monkey-egg--${position} monkey-egg--${monkeyData.mood}`;
    monkey.type = "button";
    monkey.setAttribute("aria-label", "Easter egg Invictus");
    monkey.style.setProperty("--monkey-flip", monkeyData.flip);
    monkey.style.setProperty("--monkey-scale", monkeyData.scale);
    monkey.innerHTML = `
      <span class="monkey-egg__banana" aria-hidden="true">&#127820;</span>
      <span class="monkey-egg__photo" aria-hidden="true"></span>
      <span class="monkey-egg__spark" aria-hidden="true"></span>
    `;

    monkey.addEventListener("click", () => {
      monkey.classList.add("has-banana");
      window.setTimeout(() => cleanupMonkey(monkey), 1300);
    }, { once: true });

    document.body.appendChild(monkey);
    requestAnimationFrame(() => monkey.classList.add("is-visible"));

    const lifetime = 6000 + Math.random() * 2000;
    window.setTimeout(() => cleanupMonkey(monkey), lifetime);
  }

  window.invictusMonkey = () => showMonkey(true);
  window.addEventListener("invictus:loader-ready", () => {
    window.setTimeout(() => showMonkey(true), 900);
  }, { once: true });

  if (document.body.classList.contains("is-ready")) {
    window.setTimeout(() => showMonkey(true), 900);
  }

  window.setInterval(showMonkey, 60000);
}

document.body.classList.add("is-locked");
window.addEventListener("load", () => hideLoader());
window.setTimeout(() => hideLoader(0, true), 4600);

navToggle.addEventListener("click", toggleMenu);
navMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

window.addEventListener("scroll", () => {
  setHeaderState();
  updateParallax();
});
window.addEventListener("resize", resizeCanvas);

setupReveal();
setupAccordion();
setupSlots();
setupTilt();
setupHeroCarousel();
setupHeroDepth();
setupPremiumMouseInteractions();
setupBookingForm();
setupCkTransition();
setupMonkeyEasterEgg();
setHeaderState();
resizeCanvas();

if (!prefersReducedMotion) {
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

  if (!prefersReducedMotion && !particleFrame) {
    drawParticles();
  }

  if (!prefersReducedMotion && !heroSlideTimer) {
    setupHeroCarousel();
  }
});
