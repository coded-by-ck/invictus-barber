const FIREBASE_VERSION = "10.12.5";
const BOOKINGS_COLLECTION = "bookings";
const BOOKING_LOCKS_COLLECTION = "bookingLocks";
const CANCELLATION_TOKENS_COLLECTION = "cancellationTokens";
const DEFAULT_DURATION_MINUTES = 30;
const SLOT_INTERVAL_MINUTES = 30;

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

const copy = document.querySelector("[data-cancel-copy]");
const status = document.querySelector("[data-cancel-status]");
const details = document.querySelector("[data-booking-details]");
const confirmButton = document.querySelector("[data-cancel-confirm]");
const fields = {
  client: document.querySelector("[data-detail-client]"),
  barber: document.querySelector("[data-detail-barber]"),
  service: document.querySelector("[data-detail-service]"),
  date: document.querySelector("[data-detail-date]"),
  time: document.querySelector("[data-detail-time]")
};

let tokenId = "";
let tokenRef = null;
let tokenData = null;
let bookingRef = null;
let bookingData = null;

function setStatus(message, type = "info") {
  status.textContent = message;
  status.dataset.type = type;
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function timeToMinutes(value) {
  const [hour, minute] = String(value || "00:00").split(":").map(Number);
  return (hour * 60) + (minute || 0);
}

function minutesToTime(minutes) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}

function normalizeBooking(booking) {
  const duration = Number(booking.duration) || DEFAULT_DURATION_MINUTES;
  const endTime = booking.endTime || minutesToTime(timeToMinutes(booking.time) + duration);

  return {
    ...booking,
    duration,
    endTime,
    status: booking.status || "confirmed"
  };
}

function slotLockIds(booking) {
  const normalized = normalizeBooking(booking);
  const start = timeToMinutes(normalized.time);
  const end = timeToMinutes(normalized.endTime);
  const ids = [];

  for (let minutes = start; minutes < end; minutes += SLOT_INTERVAL_MINUTES) {
    ids.push([normalized.barberId, normalized.date, minutesToTime(minutes)].join("_").replace(/[^\w-]/g, "-"));
  }

  return ids;
}

function renderBooking(booking) {
  fields.client.textContent = booking.clientName || "Cliente";
  fields.barber.textContent = booking.barberName || booking.barber || booking.barberId || "-";
  fields.service.textContent = booking.service || "-";
  fields.date.textContent = formatDate(booking.date);
  fields.time.textContent = booking.time || "-";
  details.hidden = false;
}

async function loadCancellation() {
  tokenId = new URLSearchParams(window.location.search).get("token") || "";

  if (!tokenId) {
    copy.textContent = "Link inválido ou expirado.";
    setStatus("Token ausente.", "error");
    return;
  }

  tokenRef = firestoreModule.doc(db, CANCELLATION_TOKENS_COLLECTION, tokenId);
  const tokenSnapshot = await firestoreModule.getDoc(tokenRef);

  if (!tokenSnapshot.exists()) {
    copy.textContent = "Link inválido ou expirado.";
    setStatus("Token nao encontrado.", "error");
    return;
  }

  tokenData = tokenSnapshot.data();
  if (!tokenData.bookingId) {
    copy.textContent = "Link inválido ou expirado.";
    setStatus("Token sem agendamento vinculado.", "error");
    return;
  }

  bookingRef = firestoreModule.doc(db, BOOKINGS_COLLECTION, tokenData.bookingId);
  const bookingSnapshot = await firestoreModule.getDoc(bookingRef);

  if (!bookingSnapshot.exists()) {
    copy.textContent = "Link inválido ou expirado.";
    setStatus("Agendamento nao encontrado.", "error");
    return;
  }

  bookingData = normalizeBooking({
    id: bookingSnapshot.id,
    ...bookingSnapshot.data()
  });

  renderBooking(bookingData);

  if (bookingData.status === "completed") {
    confirmButton.disabled = true;
    copy.textContent = "Este atendimento ja foi concluido e nao pode ser cancelado.";
    setStatus("Cancelamento indisponivel para agendamento concluido.", "error");
    return;
  }

  if (bookingData.status === "cancelled") {
    confirmButton.disabled = true;
    copy.textContent = "Este agendamento ja foi cancelado.";
    setStatus("O horario ja foi liberado.", "success");
    return;
  }

  if (tokenData.status !== "active") {
    confirmButton.disabled = true;
    copy.textContent = "Link inválido ou expirado.";
    setStatus("Token ja utilizado.", "error");
    return;
  }

  copy.textContent = "Confira os dados antes de cancelar.";
  setStatus("Link validado.", "success");
}

async function cancelBooking() {
  if (!bookingRef || !tokenRef || !bookingData) return;

  confirmButton.disabled = true;
  setStatus("Cancelando agendamento...", "info");

  const freshBookingSnapshot = await firestoreModule.getDoc(bookingRef);
  if (!freshBookingSnapshot.exists()) {
    setStatus("Agendamento nao encontrado.", "error");
    return;
  }

  const freshBooking = normalizeBooking({
    id: freshBookingSnapshot.id,
    ...freshBookingSnapshot.data()
  });

  if (freshBooking.status === "completed") {
    setStatus("Este atendimento ja foi concluido e nao pode ser cancelado.", "error");
    return;
  }

  if (freshBooking.status === "cancelled") {
    setStatus("Este agendamento ja estava cancelado.", "success");
    return;
  }

  const batch = firestoreModule.writeBatch(db);
  const now = new Date().toISOString();

  batch.update(bookingRef, {
    status: "cancelled",
    cancelledAt: now,
    cancellationSource: "client",
    updatedAt: now
  });

  slotLockIds(freshBooking).forEach((lockId) => {
    const lockRef = firestoreModule.doc(db, BOOKING_LOCKS_COLLECTION, lockId);
    batch.delete(lockRef);
  });

  batch.update(tokenRef, {
    status: "used",
    usedAt: now
  });

  await batch.commit();

  copy.textContent = "Agendamento cancelado. O horario foi liberado.";
  setStatus("Agendamento cancelado. O horario foi liberado.", "success");
}

confirmButton.addEventListener("click", async () => {
  try {
    await cancelBooking();
  } catch (error) {
    console.warn("Falha ao cancelar agendamento.", error);
    confirmButton.disabled = false;
    setStatus("Nao foi possivel cancelar agora. Tente novamente.", "error");
  }
});

try {
  await loadCancellation();
} catch (error) {
  console.warn("Falha ao carregar cancelamento.", error);
  copy.textContent = "Link inválido ou expirado.";
  setStatus("Nao foi possivel validar este link.", "error");
}
