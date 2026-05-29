(function () {
  const STORAGE_KEY = "invictus_barber_bookings";
  const BOOKINGS_COLLECTION = "bookings";
  const BOOKING_LOCKS_COLLECTION = "bookingLocks";
  const CANCELLATION_TOKENS_COLLECTION = "cancellationTokens";
  const SLOT_INTERVAL_MINUTES = 30;

  const BARBER_IDS = {
    Pablo: "pablo",
    Marco: "marco"
  };
  const DEFAULT_DURATION_MINUTES = 30;

  function normalizeBarberName(value) {
    return String(value || "").trim();
  }

  function getBarberId(booking) {
    if (booking.barberId) return booking.barberId;
    return BARBER_IDS[normalizeBarberName(booking.barber)] || normalizeBarberName(booking.barber).toLowerCase();
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

  function getDuration(booking) {
    return Number(booking.duration) || DEFAULT_DURATION_MINUTES;
  }

  function getEndTime(booking) {
    return booking.endTime || minutesToTime(timeToMinutes(booking.time) + getDuration(booking));
  }

  function normalizeBooking(booking) {
    const barberName = booking.barberName || normalizeBarberName(booking.barber);
    const duration = getDuration(booking);

    return {
      ...booking,
      barberId: getBarberId({ ...booking, barber: barberName }),
      barberName,
      barber: barberName,
      duration,
      endTime: booking.endTime || minutesToTime(timeToMinutes(booking.time) + duration),
      status: booking.status || "confirmed",
      createdAt: booking.createdAt || new Date().toISOString()
    };
  }

  function bookingDocumentId(booking) {
    const normalized = normalizeBooking(booking);
    return [normalized.barberId, normalized.date, normalized.time].join("_").replace(/[^\w-]/g, "-");
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

  function createSlotTakenError() {
    const error = new Error("Esse horario ja esta reservado.");
    error.code = "slot-taken";
    return error;
  }

  function isConfirmedSlotMatch(booking, candidate) {
    const startA = timeToMinutes(candidate.time);
    const endA = timeToMinutes(getEndTime(candidate));
    const startB = timeToMinutes(booking.time);
    const endB = timeToMinutes(getEndTime(booking));

    // Interval overlap: startA < endB && endA > startB.
    // Bookings antigos sem duration/endTime entram como 30 minutos.
    return (
      booking.status === "confirmed" &&
      booking.barberId === candidate.barberId &&
      booking.date === candidate.date &&
      startA < endB &&
      endA > startB
    );
  }

  function filterBookings(bookings, filters = {}) {
    return bookings.filter((booking) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return booking[key] === value;
      });
    });
  }

  function waitForFirebaseGlobal() {
    if (window.InvictusFirebase) return Promise.resolve(window.InvictusFirebase);

    return new Promise((resolve) => {
      let attempts = 0;
      const timer = window.setInterval(() => {
        attempts += 1;
        if (window.InvictusFirebase || attempts >= 20) {
          window.clearInterval(timer);
          resolve(window.InvictusFirebase || null);
        }
      }, 100);
    });
  }

  const localStorageAdapter = {
    async listBookings(filters = {}) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        const bookings = stored ? JSON.parse(stored) : [];
        return filterBookings(bookings.map(normalizeBooking), filters);
      } catch (error) {
        console.warn("Nao foi possivel ler os agendamentos.", error);
        return [];
      }
    },

    async saveBooking(booking) {
      const bookings = await this.listBookings();
      const normalized = normalizeBooking(booking);
      const documentId = bookingDocumentId(normalized);
      const existingIndex = bookings.findIndex((item) => item.id === documentId);
      const slotTaken = bookings.some((item) => isConfirmedSlotMatch(item, normalized));
      const cancelTokenId = normalized.cancelTokenId || `local-${documentId}`;

      if (slotTaken) {
        throw createSlotTakenError();
      }

      if (existingIndex >= 0) {
        bookings[existingIndex] = { ...normalized, id: documentId, cancelTokenId };
      } else {
        bookings.push({ ...normalized, id: documentId, cancelTokenId });
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
      return { ...normalized, id: documentId, cancelTokenId };
    },

    async findBooking(predicate) {
      const bookings = await this.listBookings();
      return bookings.find(predicate) || null;
    }
  };

  const firestoreAdapter = {
    async getDb() {
      const firebase = await waitForFirebaseGlobal();
      if (!firebase) return null;
      return firebase.ready ? firebase.ready : firebase.db;
    },

    async listBookings(filters = {}) {
      const db = await this.getDb();
      if (!db) throw new Error("Firestore nao esta disponivel.");

      const { collection, getDocs, query, where } = window.InvictusFirebase.modules;
      const constraints = [];

      // Sincronizacao dos horarios: usa um filtro simples no Firestore e refina
      // no cliente para evitar depender de indice composto barberId/date/status.
      if (filters.barberId) {
        constraints.push(where("barberId", "==", filters.barberId));
      } else if (filters.barberName) {
        constraints.push(where("barberName", "==", filters.barberName));
      } else if (filters.date) {
        constraints.push(where("date", "==", filters.date));
      }

      const bookingsRef = collection(db, BOOKINGS_COLLECTION);
      const snapshot = await getDocs(constraints.length ? query(bookingsRef, ...constraints) : bookingsRef);

      const bookings = snapshot.docs.map((item) => normalizeBooking({
        id: item.id,
        ...item.data()
      }));

      return filterBookings(bookings, filters);
    },

    async saveBooking(booking) {
      const db = await this.getDb();
      if (!db) throw new Error("Firestore nao esta disponivel.");

      const { collection, doc, query, runTransaction, where } = window.InvictusFirebase.modules;
      const normalized = normalizeBooking(booking);
      const documentId = bookingDocumentId(normalized);
      const bookingRef = doc(db, BOOKINGS_COLLECTION, documentId);
      const cancelTokenId = normalized.cancelTokenId;
      const tokenRef = cancelTokenId ? doc(db, CANCELLATION_TOKENS_COLLECTION, cancelTokenId) : null;
      const lockRefs = slotLockIds(normalized).map((lockId) => {
        return doc(db, BOOKING_LOCKS_COLLECTION, lockId);
      });
      const payload = {
        ...normalized,
        id: documentId
      };

      const currentBookings = await this.listBookings({
        barberId: normalized.barberId,
        date: normalized.date,
        status: "confirmed"
      });

      if (currentBookings.some((item) => isConfirmedSlotMatch(item, normalized))) {
        throw createSlotTakenError();
      }

      // Prevencao de conflito: cada fatia de 30 min do atendimento ganha um lock.
      // A transacao le esses documentos antes de escrever, evitando reserva dupla.
      await runTransaction(db, async (transaction) => {
        const existingLocks = await Promise.all(lockRefs.map((lockRef) => transaction.get(lockRef)));
        const existingToken = tokenRef ? await transaction.get(tokenRef) : null;
        if (existingLocks.some((lock) => lock.exists())) {
          throw createSlotTakenError();
        }
        if (existingToken && existingToken.exists()) {
          throw new Error("Token de cancelamento ja existe.");
        }

        lockRefs.forEach((lockRef) => {
          transaction.set(lockRef, {
            bookingId: documentId,
            barberId: normalized.barberId,
            date: normalized.date,
            status: normalized.status,
            createdAt: normalized.createdAt
          });
        });
        if (tokenRef) {
          transaction.set(tokenRef, {
            token: cancelTokenId,
            bookingId: documentId,
            barberId: normalized.barberId,
            date: normalized.date,
            time: normalized.time,
            status: "active",
            createdAt: normalized.cancelTokenCreatedAt || normalized.createdAt
          });
        }
        transaction.set(bookingRef, payload);
      });

      return payload;
    },

    async findBooking(predicate) {
      const bookings = await this.listBookings();
      return bookings.find(predicate) || null;
    }
  };

  async function withFallback(action, fallbackAction) {
    try {
      return await action();
    } catch (error) {
      if (error && error.code === "slot-taken") {
        throw error;
      }
      console.warn("Firestore falhou. Usando fallback localStorage.", error);
      return fallbackAction();
    }
  }

  window.InvictusStorage = {
    adapter: firestoreAdapter,
    adapters: {
      localStorage: localStorageAdapter,
      firestore: firestoreAdapter
    },

    use(adapter) {
      this.adapter = adapter;
    },

    listBookings(filters) {
      return withFallback(
        () => this.adapter.listBookings(filters),
        () => localStorageAdapter.listBookings(filters)
      );
    },

    saveBooking(booking) {
      return withFallback(
        () => this.adapter.saveBooking(booking),
        () => localStorageAdapter.saveBooking(booking)
      );
    },

    getBookings(filters) {
      return this.listBookings(filters);
    },

    findBooking(predicate) {
      return withFallback(
        () => this.adapter.findBooking(predicate),
        () => localStorageAdapter.findBooking(predicate)
      );
    }
  };
})();
