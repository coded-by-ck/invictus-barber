const FIREBASE_VERSION = "10.12.5";
const BOOKINGS_COLLECTION = "bookings";
const SERVICE_PRICES = [
  ["Assinatura (corte e barba terapia)", 150],
  ["Assinatura corte", 130],
  ["Barba", 35],
  ["Corte", 45],
  ["Corte + barba", 80],
  ["Corte + barba + sobrancelha", 90],
  ["Corte + cavanhaque + sobrancelha", 70],
  ["Corte + hidratacao", 70],
  ["Corte + hidratação", 70],
  ["Corte + sobrancelha", 55],
  ["Limpeza de pele", 50],
  ["Hidratacao", 30],
  ["Hidratação", 30],
  ["Luzes", 140],
  ["Luzes + corte", 185],
  ["Nevou", 160],
  ["Nevou + corte", 200],
  ["Selagem", 130]
];

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

const globalRevenueTodayMetric = document.querySelector("[data-global-revenue-today]");
const globalRevenueMonthMetric = document.querySelector("[data-global-revenue-month]");
const globalBookingsTodayMetric = document.querySelector("[data-global-bookings-today]");
const globalCancellationsTodayMetric = document.querySelector("[data-global-cancellations-today]");
const filterTotalMetric = document.querySelector("[data-filter-total]");
const filterConfirmedMetric = document.querySelector("[data-filter-confirmed]");
const filterCompletedMetric = document.querySelector("[data-filter-completed]");
const filterCancelledMetric = document.querySelector("[data-filter-cancelled]");
const filterRevenueForecastMetric = document.querySelector("[data-filter-revenue-forecast]");
const filterCutsMetric = document.querySelector("[data-filter-cuts]");
const filterTopCompletedBarberMetric = document.querySelector("[data-filter-top-completed-barber]");
const filterTopCompletedBarberDetail = document.querySelector("[data-filter-top-completed-barber-detail]");
const filterTopActiveBarberMetric = document.querySelector("[data-filter-top-active-barber]");
const filterTopActiveBarberDetail = document.querySelector("[data-filter-top-active-barber-detail]");
const filterTopServiceMetric = document.querySelector("[data-filter-top-service]");
const filterTopServiceDetail = document.querySelector("[data-filter-top-service-detail]");
const serviceRankingList = document.querySelector("[data-service-ranking]");
const barberRankingList = document.querySelector("[data-barber-ranking]");
const status = document.querySelector("[data-master-status]");
const list = document.querySelector("[data-master-bookings]");
const kicker = document.querySelector("[data-master-kicker]");
const logoutButton = document.querySelector("[data-master-logout]");
const filtersForm = document.querySelector("[data-master-filters]");

let unsubscribeBookings = null;
let allBookings = [];
const servicePriceMap = new Map(SERVICE_PRICES.map(([name, price]) => [normalizeServiceName(name), price]));

function normalizeServiceName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfCurrentWeek(date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfCurrentWeek(date) {
  const end = startOfCurrentWeek(date);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function normalizeBooking(booking) {
  return {
    ...booking,
    status: String(booking.status || "confirmed").toLowerCase()
  };
}

function parseCurrency(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const normalized = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const price = Number.parseFloat(normalized);
  return Number.isFinite(price) ? price : 0;
}

function getBookingPrice(booking) {
  const directPrice = parseCurrency(booking.servicePrice);
  if (directPrice > 0) return directPrice;

  const snapshotPrice = parseCurrency(booking.serviceSnapshot && booking.serviceSnapshot.price);
  if (snapshotPrice > 0) return snapshotPrice;

  const labelPrice = parseCurrency(booking.servicePriceLabel || (booking.serviceSnapshot && booking.serviceSnapshot.priceLabel));
  if (labelPrice > 0) return labelPrice;

  // Compatibilidade: bookings antigos nao tinham preco salvo; nesses casos
  // o dashboard usa a tabela atual pelo nome do servico.
  return servicePriceMap.get(normalizeServiceName(booking.service)) || 0;
}

function isRevenueBooking(booking) {
  return booking.status === "confirmed" || booking.status === "completed";
}

function isRealizedRevenueBooking(booking) {
  return booking.status === "completed";
}

function isSameMonth(dateValue, referenceDate) {
  const [year, month] = String(dateValue || "").split("-");
  return year === String(referenceDate.getFullYear()) && month === String(referenceDate.getMonth() + 1).padStart(2, "0");
}

function isInCurrentWeek(dateValue, referenceDate) {
  if (!dateValue) return false;
  const start = toDateInputValue(startOfCurrentWeek(referenceDate));
  const end = toDateInputValue(endOfCurrentWeek(referenceDate));
  return dateValue >= start && dateValue <= end;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value || 0);
}

function incrementRanking(map, key, label, amount = 1) {
  const normalizedKey = key || "nao-informado";
  const current = map.get(normalizedKey) || { label, count: 0 };
  current.count += amount;
  map.set(normalizedKey, current);
}

function toRanking(map) {
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function renderRanking(target, ranking, emptyLabel, suffix = "") {
  if (!ranking.length) {
    target.innerHTML = `<li><strong>${escapeHtml(emptyLabel)}</strong><span>0</span></li>`;
    return;
  }

  target.innerHTML = ranking.slice(0, 5).map((item) => {
    return `<li><strong>${escapeHtml(item.label)}</strong><span>${item.count}${suffix}</span></li>`;
  }).join("");
}

function sortBookings(bookings) {
  return [...bookings].sort((a, b) => {
    return `${b.date || ""} ${b.time || ""}`.localeCompare(`${a.date || ""} ${a.time || ""}`);
  });
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

function getStatusMeta(statusValue) {
  const normalized = String(statusValue || "pending").toLowerCase();
  const statuses = {
    confirmed: { label: "confirmed", className: "status-pill--confirmed" },
    completed: { label: "completed", className: "status-pill--completed" },
    cancelled: { label: "cancelled", className: "status-pill--cancelled" },
    pending: { label: "pending", className: "status-pill--pending" }
  };

  return statuses[normalized] || statuses.pending;
}

function setStatus(message) {
  status.textContent = message;
}

function getCurrentFilters() {
  const formData = new FormData(filtersForm);
  return {
    barber: String(formData.get("barber") || "all"),
    status: String(formData.get("status") || "all"),
    period: String(formData.get("period") || "all")
  };
}

function matchesBarberFilter(booking, barberFilter) {
  if (barberFilter === "all") return true;
  const barberId = normalizeServiceName(booking.barberId);
  const barberName = normalizeServiceName(booking.barberName || booking.barber);
  return barberId === barberFilter || barberName === barberFilter;
}

function matchesPeriodFilter(booking, periodFilter) {
  if (periodFilter === "all") return true;

  const now = new Date();
  const today = toDateInputValue(now);

  if (periodFilter === "today") return booking.date === today;
  if (periodFilter === "week") return isInCurrentWeek(booking.date, now);
  if (periodFilter === "month") return isSameMonth(booking.date, now);

  return true;
}

function getFilteredBookings() {
  const filters = getCurrentFilters();

  return allBookings.filter((booking) => {
    const statusMatches = filters.status === "all" || booking.status === filters.status;
    return (
      matchesBarberFilter(booking, filters.barber) &&
      statusMatches &&
      matchesPeriodFilter(booking, filters.period)
    );
  });
}

function getFilterLabel(filters) {
  const parts = [];
  if (filters.barber !== "all") parts.push(filters.barber === "pablo" ? "Pablo" : "Marco");
  if (filters.status !== "all") parts.push(filters.status);
  if (filters.period !== "all") {
    const labels = {
      today: "hoje",
      week: "semana",
      month: "mes"
    };
    parts.push(labels[filters.period] || filters.period);
  }
  return parts.length ? ` Filtros: ${parts.join(" · ")}.` : "";
}

function renderGlobalMetrics(bookings) {
  const today = toDateInputValue(new Date());
  const now = new Date();
  const realizedBookings = bookings.filter(isRealizedRevenueBooking);
  const revenueToday = realizedBookings
    .filter((booking) => booking.date === today)
    .reduce((total, booking) => total + getBookingPrice(booking), 0);
  const revenueMonth = realizedBookings
    .filter((booking) => isSameMonth(booking.date, now))
    .reduce((total, booking) => total + getBookingPrice(booking), 0);
  const bookingsToday = bookings.filter((booking) => booking.date === today).length;
  const cancellationsToday = bookings.filter((booking) => booking.date === today && booking.status === "cancelled").length;

  globalRevenueTodayMetric.textContent = formatCurrency(revenueToday);
  globalRevenueMonthMetric.textContent = formatCurrency(revenueMonth);
  globalBookingsTodayMetric.textContent = bookingsToday;
  globalCancellationsTodayMetric.textContent = cancellationsToday;
}

function renderFilteredMetrics(bookings) {
  const revenueBookings = bookings.filter(isRevenueBooking);
  const forecastRevenue = revenueBookings.reduce((total, booking) => total + getBookingPrice(booking), 0);
  const serviceRanking = new Map();
  const completedBarberRanking = new Map();
  const activeBarberRanking = new Map();

  revenueBookings.forEach((booking) => {
    const serviceLabel = booking.service || "Servico nao informado";
    const barberLabel = booking.barberName || booking.barber || booking.barberId || "Barbeiro nao informado";

    incrementRanking(serviceRanking, normalizeServiceName(serviceLabel), serviceLabel);
    incrementRanking(activeBarberRanking, String(booking.barberId || barberLabel).toLowerCase(), barberLabel);

    if (booking.status === "completed") {
      incrementRanking(completedBarberRanking, String(booking.barberId || barberLabel).toLowerCase(), barberLabel);
    }
  });

  const rankedServices = toRanking(serviceRanking);
  const rankedCompletedBarbers = toRanking(completedBarberRanking);
  const rankedActiveBarbers = toRanking(activeBarberRanking);
  const topService = rankedServices[0];
  const topCompletedBarber = rankedCompletedBarbers[0];
  const topActiveBarber = rankedActiveBarbers[0];

  filterTotalMetric.textContent = bookings.length;
  filterConfirmedMetric.textContent = bookings.filter((booking) => booking.status === "confirmed").length;
  filterCompletedMetric.textContent = bookings.filter((booking) => booking.status === "completed").length;
  filterCancelledMetric.textContent = bookings.filter((booking) => booking.status === "cancelled").length;
  filterRevenueForecastMetric.textContent = formatCurrency(forecastRevenue);
  filterCutsMetric.textContent = revenueBookings.filter((booking) => normalizeServiceName(booking.service).includes("corte")).length;
  filterTopServiceMetric.textContent = topService ? topService.label : "-";
  filterTopServiceDetail.textContent = topService ? `${topService.count} venda(s)` : "Nenhum servico ainda";
  filterTopCompletedBarberMetric.textContent = topCompletedBarber ? `${topCompletedBarber.label} - ${topCompletedBarber.count}` : "-";
  filterTopCompletedBarberDetail.textContent = topCompletedBarber ? "atendimento(s) concluido(s)" : "Nenhum atendimento concluido";
  filterTopActiveBarberMetric.textContent = topActiveBarber ? `${topActiveBarber.label} - ${topActiveBarber.count}` : "-";
  filterTopActiveBarberDetail.textContent = topActiveBarber ? "agendamento(s) ativo(s)" : "Nenhum agendamento ativo";
  renderRanking(serviceRankingList, rankedServices, "Nenhum servico ainda");
  renderRanking(barberRankingList, rankedCompletedBarbers, "Nenhum atendimento concluido", " concluido(s)");
}

function renderBookings(bookings) {
  renderFilteredMetrics(bookings);

  if (!bookings.length) {
    list.classList.remove("booking-table");
    list.classList.add("empty-state");
    list.innerHTML = "Nenhum agendamento encontrado.";
    return;
  }

  list.classList.add("booking-table");
  list.classList.remove("empty-state");
  list.innerHTML = bookings.map((booking) => {
    const statusMeta = getStatusMeta(booking.status);

    return `<article class="booking-row">
      <div>
        <small>Cliente</small>
        <strong>${escapeHtml(booking.clientName || "Cliente")}</strong>
      </div>
      <div>
        <small>Servico</small>
        <strong>${escapeHtml(booking.service || "-")}</strong>
      </div>
      <div>
        <small>Barbeiro</small>
        <strong>${escapeHtml(booking.barberName || booking.barber || booking.barberId || "-")}</strong>
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
        <span class="status-pill ${statusMeta.className}">${escapeHtml(statusMeta.label)}</span>
      </div>
    </article>`;
  }).join("");
}

function applyFilters() {
  const filteredBookings = sortBookings(getFilteredBookings());
  renderGlobalMetrics(allBookings);
  renderBookings(filteredBookings);
  setStatus(`${filteredBookings.length} de ${allBookings.length} agendamento(s) exibido(s).${getFilterLabel(getCurrentFilters())}`);
}

async function getAdminProfile(uid) {
  const profileRef = firestoreModule.doc(db, "users", uid);
  const profile = await firestoreModule.getDoc(profileRef);
  if (!profile.exists()) return null;

  const data = profile.data();
  if (data.role !== "admin") return null;

  return {
    uid,
    role: data.role,
    name: data.name || "Administrador"
  };
}

function watchAllBookings() {
  const bookingsRef = firestoreModule.collection(db, BOOKINGS_COLLECTION);

  unsubscribeBookings = firestoreModule.onSnapshot(bookingsRef, (snapshot) => {
    allBookings = snapshot.docs.map((item) => normalizeBooking({
      id: item.id,
      ...item.data()
    }));

    applyFilters();
  }, (error) => {
    console.warn("Falha ao carregar agendamentos gerais.", error);
    setStatus("Nao foi possivel carregar os agendamentos.");
  });
}

logoutButton.addEventListener("click", async () => {
  if (unsubscribeBookings) unsubscribeBookings();
  window.sessionStorage.removeItem("invictus_admin_profile");
  await authModule.signOut(auth);
  window.location.assign("login.html");
});

filtersForm.addEventListener("change", applyFilters);

authModule.onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  try {
    const profile = await getAdminProfile(user.uid);

    if (!profile) {
      await authModule.signOut(auth);
      window.location.replace("login.html");
      return;
    }

    window.sessionStorage.setItem("invictus_admin_profile", JSON.stringify(profile));
    kicker.textContent = `Painel geral - ${profile.name}`;
    watchAllBookings();
  } catch (error) {
    console.warn("Nao foi possivel validar o administrador.", error);
    window.location.replace("login.html");
  }
});
