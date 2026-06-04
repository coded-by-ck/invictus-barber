const FIREBASE_VERSION = "10.12.5";
const BOOKINGS_COLLECTION = "bookings";

const firebaseConfig = {
  apiKey: "AIzaSyAG57hdHjjhlrTChXQ0OBXkvKrtcTrI5P8",
  authDomain: "invictus-barber-6c32d.firebaseapp.com",
  projectId: "invictus-barber-6c32d",
  storageBucket: "invictus-barber-6c32d.firebasestorage.app",
  messagingSenderId: "319574861719",
  appId: "1:319574861719:web:20bb3e3ac67ee66f6cc6d2",
  measurementId: "G-6GSES2BZKK"
};

const [{ initializeApp }, firestoreModule] = await Promise.all([
  import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
  import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
]);

const app = initializeApp(firebaseConfig);
const db = firestoreModule.getFirestore(app);

const form = document.querySelector("[data-my-bookings-form]");
const input = form.elements.clientWhatsapp;
const submitButton = document.querySelector("[data-my-bookings-submit]");
const status = document.querySelector("[data-my-bookings-status]");
const list = document.querySelector("[data-my-bookings-list]");

function sanitizePhone(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function setStatus(message, type = "info") {
  status.textContent = message;
  status.dataset.type = type;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}

function getCancellationUrl(booking) {
  if (!booking.cancelTokenId) return "";
  const url = new URL("cancelamento.html", window.location.href);
  url.searchParams.set("token", booking.cancelTokenId);
  return url.toString();
}

function getStatusMeta(status) {
  const normalized = String(status || "pending").toLowerCase();
  const statuses = {
    confirmed: { label: "CONFIRMED", className: "status-badge--confirmed" },
    completed: { label: "COMPLETED", className: "status-badge--completed" },
    cancelled: { label: "CANCELLED", className: "status-badge--cancelled" },
    pending: { label: "PENDING", className: "status-badge--pending" }
  };

  return statuses[normalized] || statuses.pending;
}

function sortBookings(bookings) {
  return [...bookings].sort((a, b) => {
    return `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`);
  });
}

function renderBookings(bookings) {
  if (!bookings.length) {
    list.innerHTML = `<div class="empty-state">
      <strong>Nenhum agendamento encontrado.</strong>
      <span>Quando voce tiver um horario ativo, ele aparecera aqui.</span>
      <a class="home-link" href="index.html#agenda">Agendar horario</a>
    </div>`;
    return;
  }

  list.innerHTML = bookings.map((booking) => {
    const cancellationUrl = getCancellationUrl(booking);
    const status = getStatusMeta(booking.status);
    const canCancel = booking.status === "confirmed" && cancellationUrl;
    const action = canCancel
      ? `<a class="cancel-link" href="${escapeHtml(cancellationUrl)}" aria-label="Cancelar agendamento de ${escapeHtml(booking.service || "servico")} em ${formatDate(booking.date)} ${escapeHtml(booking.time || "")}">Cancelar agendamento</a>`
      : '<span class="unavailable-action">Cancelamento indisponivel</span>';

    return `<article class="booking-card" tabindex="0" aria-label="Agendamento ${escapeHtml(status.label.toLowerCase())} em ${formatDate(booking.date)} ${escapeHtml(booking.time || "")}">
      <header class="booking-card__header">
        <span class="booking-card__eyebrow">Servico</span>
        <h2 class="booking-card__service">${escapeHtml(booking.service || "-")}</h2>
      </header>
      <dl class="booking-card__meta">
        <div>
          <dt>Barbeiro</dt>
          <dd>${escapeHtml(booking.barberName || booking.barber || booking.barberId || "-")}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>${formatDate(booking.date)}</dd>
        </div>
        <div>
          <dt>Horario</dt>
          <dd>${escapeHtml(booking.time || "-")}</dd>
        </div>
      </dl>
      <footer class="booking-card__footer">
        <span class="status-badge ${status.className}">${status.label}</span>
        ${action}
      </footer>
    </article>`;
  }).join("");
}

async function findBookings(phoneDigits) {
  const bookingsRef = firestoreModule.collection(db, BOOKINGS_COLLECTION);
  const bookingsQuery = firestoreModule.query(bookingsRef, firestoreModule.where("clientWhatsapp", "==", phoneDigits));
  const snapshot = await firestoreModule.getDocs(bookingsQuery);

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((booking) => sanitizePhone(booking.clientWhatsapp) === phoneDigits);
}

input.addEventListener("input", () => {
  const digits = sanitizePhone(input.value);
  if (input.value.replace(/\D/g, "").length > 11) {
    input.value = digits;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const phoneDigits = sanitizePhone(input.value);
  if (phoneDigits.length < 10) {
    list.innerHTML = "";
    setStatus("Digite um WhatsApp válido com DDD.", "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Buscando...";
  submitButton.setAttribute("aria-busy", "true");
  setStatus("Buscando agendamentos...", "info");

  try {
    const bookings = sortBookings(await findBookings(phoneDigits));
    renderBookings(bookings);
    setStatus(bookings.length ? `${bookings.length} agendamento(s) encontrado(s).` : "Nenhum agendamento encontrado.", bookings.length ? "success" : "info");
  } catch (error) {
    console.warn("Falha ao buscar agendamentos do cliente.", error);
    list.innerHTML = "";
    setStatus("Nao foi possivel buscar seus agendamentos agora.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Buscar";
    submitButton.removeAttribute("aria-busy");
  }
});

list.addEventListener("click", (event) => {
  const link = event.target.closest(".cancel-link");
  if (!link || link.getAttribute("aria-disabled") === "true") return;

  link.setAttribute("aria-disabled", "true");
  link.textContent = "Abrindo cancelamento...";
});
