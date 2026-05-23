(function () {
  const STORAGE_KEY = "invictus_barber_bookings";

  const localStorageAdapter = {
    async listBookings() {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.warn("Nao foi possivel ler os agendamentos.", error);
        return [];
      }
    },

    async saveBooking(booking) {
      const bookings = await this.listBookings();
      bookings.push(booking);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
      return booking;
    },

    async findBooking(predicate) {
      const bookings = await this.listBookings();
      return bookings.find(predicate) || null;
    }
  };

  const firestoreAdapter = {
    async listBookings() {
      throw new Error("Firestore ainda nao esta configurado.");
    },

    async saveBooking() {
      throw new Error("Firestore ainda nao esta configurado.");
    },

    async findBooking() {
      throw new Error("Firestore ainda nao esta configurado.");
    }
  };

  window.InvictusStorage = {
    adapter: localStorageAdapter,
    adapters: {
      localStorage: localStorageAdapter,
      firestore: firestoreAdapter
    },

    use(adapter) {
      this.adapter = adapter;
    },

    listBookings() {
      return this.adapter.listBookings();
    },

    saveBooking(booking) {
      return this.adapter.saveBooking(booking);
    },

    findBooking(predicate) {
      return this.adapter.findBooking(predicate);
    }
  };
})();
