(function () {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const prefersTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const compactQuery = window.matchMedia("(max-width: 720px)");

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

  const draculaColors = ["#bd93f9", "#ff79c6", "#8be9fd", "#f8f8f2", "#6272a4", "#ffb86c", "#ff5555"];

  function getTiming() {
    const isCompact = compactQuery.matches || prefersTouch;
    return {
      isCompact,
      totalDuration: prefersReducedMotion ? 900 : isCompact ? 3800 : 5200,
      leaveDelay: prefersReducedMotion ? 650 : isCompact ? 3200 : 4480
    };
  }

  function createOverlay() {
    const timing = getTiming();
    const overlay = document.createElement("div");
    overlay.className = "ck-transition-loader";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.setProperty("--ck-duration", `${timing.totalDuration}ms`);
    overlay.style.setProperty("--ck-leave-duration", `${timing.totalDuration - timing.leaveDelay}ms`);
    overlay.style.setProperty("--ck-progress-duration", `${Math.max(timing.totalDuration - 160, 700)}ms`);

    const codeLayerBack = document.createElement("div");
    codeLayerBack.className = "ck-transition-loader__code ck-transition-loader__code--back";

    const codeLayerFront = document.createElement("div");
    codeLayerFront.className = "ck-transition-loader__code ck-transition-loader__code--front";

    const streamCount = prefersReducedMotion ? 6 : timing.isCompact ? 10 : 18;
    const particleCount = prefersReducedMotion ? 0 : timing.isCompact ? 3 : 8;

    Array.from({ length: streamCount }).forEach((_, index) => {
      const stream = document.createElement("span");
      const lines = codeSnippets[index % codeSnippets.length];

      lines.join("\n").split("").slice(0, timing.isCompact ? 32 : 52).forEach((char, charIndex) => {
        const item = document.createElement("b");
        item.textContent = char === " " ? "\u00a0" : char;
        item.style.setProperty("--token-delay", `${charIndex * (timing.isCompact ? 0.014 : 0.018)}s`);
        item.style.setProperty("--code-color", draculaColors[(index + charIndex) % draculaColors.length]);
        stream.appendChild(item);
      });

      stream.style.setProperty("--x", `${8 + Math.random() * 84}%`);
      stream.style.setProperty("--delay", `${Math.random() * (timing.isCompact ? 0.16 : 0.36)}s`);
      stream.style.setProperty("--duration", `${(timing.isCompact ? 3.2 : 4.45) + Math.random() * (timing.isCompact ? 0.45 : 0.8)}s`);
      stream.style.setProperty("--depth", `${(timing.isCompact ? 0.66 : 0.72) + Math.random() * (timing.isCompact ? 0.28 : 0.4)}`);
      stream.style.setProperty("--drift", `${timing.isCompact ? -8 + Math.random() * 16 : -14 + Math.random() * 28}px`);
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
      particle.style.setProperty("--duration", `${(timing.isCompact ? 2.8 : 3.6) + Math.random() * 2.4}s`);
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
        <span>INITIALIZING CODED BY CK</span>
      </div>
      <div class="ck-transition-loader__progress"></div>
    `;

    overlay.prepend(codeLayerBack);
    overlay.appendChild(particles);
    overlay.appendChild(codeLayerFront);
    document.body.appendChild(overlay);
    return overlay;
  }

  function setupCkTransition() {
    document.querySelectorAll("[data-ck-signature]").forEach((signature) => {
      if (signature.dataset.ckLoaderBound === "true") return;
      signature.dataset.ckLoaderBound = "true";
      let isTransitioning = false;

      signature.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
        event.preventDefault();
        if (isTransitioning) return;
        isTransitioning = true;

        const target = signature.href;
        const overlay = createOverlay();
        const timing = getTiming();

        requestAnimationFrame(() => overlay.classList.add("is-active"));
        window.setTimeout(() => overlay.classList.add("is-leaving"), timing.leaveDelay);
        window.setTimeout(() => {
          overlay.remove();
          const nextTab = window.open(target, "_blank", "noopener,noreferrer");
          if (!nextTab) window.location.assign(target);
          isTransitioning = false;
        }, timing.totalDuration);
      });
    });
  }

  window.setupCkTransition = setupCkTransition;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupCkTransition, { once: true });
  } else {
    setupCkTransition();
  }
})();
