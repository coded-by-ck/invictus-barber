const FIREBASE_VERSION = "10.12.5";
const BOOKINGS_COLLECTION = "bookings";
const BOOKING_LOCKS_COLLECTION = "bookingLocks";
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

const [{ initializeApp }, authModule, firestoreModule] = await Promise.all([
  import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
  import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
  import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
]);

const app = initializeApp(firebaseConfig);
const auth = authModule.getAuth(app);
const db = firestoreModule.getFirestore(app);

const title = document.querySelector("[data-admin-title]");
const kicker = document.querySelector("[data-admin-kicker]");
const status = document.querySelector("[data-panel-status]");
const list = document.querySelector("[data-booking-list]");
const todayMetric = document.querySelector("[data-metric-today]");
const pendingMetric = document.querySelector("[data-metric-pending]");
const completedMetric = document.querySelector("[data-metric-completed]");
const logoutButton = document.querySelector("[data-admin-logout]");

let currentProfile = null;
let unsubscribeBookings = null;

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function setStatus(message) {
  status.textContent = message;
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

async function getBarberProfile(uid) {
  const profileRef = firestoreModule.doc(db, "users", uid);
  const profile = await firestoreModule.getDoc(profileRef);
  if (!profile.exists()) return null;

  const data = profile.data();
  if (data.role !== "barber" || !data.barberId) return null;

  return {
    uid,
    role: data.role,
    barberId: data.barberId,
    name: data.name || data.barberName || data.barberId
  };
}

function renderMetrics(bookings) {
  const today = toDateInputValue(new Date());
  todayMetric.textContent = bookings.filter((booking) => booking.date === today).length;
  pendingMetric.textContent = bookings.filter((booking) => booking.status === "confirmed").length;
  completedMetric.textContent = bookings.filter((booking) => booking.status === "completed").length;
}

function renderBookings(bookings) {
  renderMetrics(bookings);

  if (!bookings.length) {
    list.innerHTML = '<div class="empty-state">Nenhum agendamento encontrado para este barbeiro.</div>';
    return;
  }

  list.innerHTML = bookings.map((booking) => {
    const actionDisabled = booking.status !== "confirmed" ? " disabled" : "";

    return `<article class="booking-card" data-booking-id="${escapeHtml(booking.id)}">
      <div>
        <small>Cliente</small>
        <strong>${escapeHtml(booking.clientName || "Cliente")}</strong>
      </div>
      <div>
        <small>Servico</small>
        <strong>${escapeHtml(booking.service || "-")}</strong>
      </div>
      <div>
        <small>Data</small>
        <strong>${formatDate(booking.date)}</strong>
      </div>
      <div>
        <small>Horario</small>
        <strong>${escapeHtml(booking.time || "-")}</strong>
      </div>
      <div>
        <small>Status</small>
        <span class="status-pill">${escapeHtml(booking.status)}</span>
      </div>
      <div class="actions">
        <button class="action action--complete" type="button" data-action="complete" title="Concluir"${actionDisabled}>✓</button>
        <button class="action action--cancel" type="button" data-action="cancel" title="Cancelar"${actionDisabled}>✕</button>
      </div>
    </article>`;
  }).join("");
}

function sortBookings(bookings) {
  return [...bookings].sort((a, b) => {
    return `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`);
  });
}

function watchBookings(profile) {
  const bookingsRef = firestoreModule.collection(db, BOOKINGS_COLLECTION);
  const bookingsQuery = firestoreModule.query(bookingsRef, firestoreModule.where("barberId", "==", profile.barberId));

  unsubscribeBookings = firestoreModule.onSnapshot(bookingsQuery, (snapshot) => {
    const bookings = snapshot.docs.map((item) => normalizeBooking({
      id: item.id,
      ...item.data()
    }));

    renderBookings(sortBookings(bookings));
    setStatus(`${bookings.length} agendamento(s) carregado(s).`);
  }, (error) => {
    console.warn("Falha ao carregar agenda do barbeiro.", error);
    setStatus("Nao foi possivel carregar a agenda.");
  });
}

async function updateBookingStatus(bookingId, nextStatus) {
  const bookingRef = firestoreModule.doc(db, BOOKINGS_COLLECTION, bookingId);
  const bookingSnapshot = await firestoreModule.getDoc(bookingRef);

  if (!bookingSnapshot.exists()) {
    throw new Error("Agendamento nao encontrado.");
  }

  const booking = normalizeBooking({
    id: bookingSnapshot.id,
    ...bookingSnapshot.data()
  });

  if (booking.barberId !== currentProfile.barberId) {
    throw new Error("Agendamento fora do barbeiro logado.");
  }

  if (nextStatus === "completed") {
    await firestoreModule.updateDoc(bookingRef, {
      status: nextStatus,
      updatedAt: new Date().toISOString()
    });
    return;
  }

  const batch = firestoreModule.writeBatch(db);
  batch.update(bookingRef, {
    status: nextStatus,
    updatedAt: new Date().toISOString()
  });

  slotLockIds(booking).forEach((lockId) => {
    const lockRef = firestoreModule.doc(db, BOOKING_LOCKS_COLLECTION, lockId);
    batch.delete(lockRef);
  });

  await batch.commit();
}

list.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const card = button.closest("[data-booking-id]");
  const bookingId = card ? card.dataset.bookingId : "";
  if (!bookingId) return;

  const nextStatus = button.dataset.action === "complete" ? "completed" : "cancelled";
  button.disabled = true;
  setStatus(nextStatus === "completed" ? "Concluindo agendamento..." : "Cancelando e liberando horario...");

  try {
    await updateBookingStatus(bookingId, nextStatus);
    setStatus(nextStatus === "completed" ? "Agendamento concluido." : "Agendamento cancelado e horario liberado.");
  } catch (error) {
    console.warn("Falha ao atualizar agendamento.", error);
    setStatus("Nao foi possivel atualizar este agendamento.");
    button.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  if (unsubscribeBookings) unsubscribeBookings();
  window.sessionStorage.removeItem("invictus_admin_profile");
  await authModule.signOut(auth);
  window.location.assign("login.html");
});

authModule.onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  try {
    currentProfile = await getBarberProfile(user.uid);

    if (!currentProfile) {
      await authModule.signOut(auth);
      window.location.replace("login.html");
      return;
    }

    window.sessionStorage.setItem("invictus_admin_profile", JSON.stringify(currentProfile));
    title.textContent = `Agenda de ${currentProfile.name}`;
    kicker.textContent = `Painel individual · ${currentProfile.barberId}`;
    watchBookings(currentProfile);
  } catch (error) {
    console.warn("Nao foi possivel validar o barbeiro.", error);
    window.location.replace("login.html");
  }
});
