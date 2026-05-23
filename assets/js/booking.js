(function () {
  const SERVICES = [
    { name: "Assinatura (corte e barba terapia)", price: "R$ 150,00", duration: "60 min", image: "assets/img/acao-2.JPG", description: "Corte e barba terapia em uma experiencia completa." },
    { name: "Assinatura corte", price: "R$ 130,00", duration: "30 min", image: "assets/img/tesoura.JPG", description: "Plano de corte para manter o visual sempre alinhado." },
    { name: "Barba", price: "R$ 35,00", duration: "30 min", image: "assets/img/acao-1.JPG", description: "Acabamento e alinhamento com navalha premium." },
    { name: "Corte", price: "R$ 45,00", duration: "30 min", image: "assets/img/acao-3.JPG", description: "Corte masculino personalizado com acabamento limpo." },
    { name: "Corte + barba", price: "R$ 80,00", duration: "60 min", image: "assets/img/dupla.JPG", description: "Combo classico para cabelo e barba no mesmo ritual." },
    { name: "Corte + barba + sobrancelha", price: "R$ 90,00", duration: "60 min", image: "assets/img/acao-4.JPG", description: "Pacote completo com sobrancelha alinhada." },
    { name: "Corte + cavanhaque + sobrancelha", price: "R$ 70,00", duration: "30 min", image: "assets/img/bancada.JPG", description: "Corte com acabamento de rosto e sobrancelha." },
    { name: "Corte + hidratação", price: "R$ 70,00", duration: "45 min", image: "assets/img/produtos-1.JPG", description: "Corte com tratamento para saude e brilho dos fios." },
    { name: "Corte + sobrancelha", price: "R$ 55,00", duration: "30 min", image: "assets/img/tesoura.JPG", description: "Corte masculino com sobrancelha finalizada." },
    { name: "Hidratação", price: "R$ 30,00", duration: "15 min", image: "assets/img/produtos-2.JPG", description: "Tratamento rapido para revitalizar os fios." },
    { name: "Limpeza de pele", price: "R$ 50,00", duration: "30 min", image: "assets/img/borrifador.JPG", description: "Cuidado facial para renovar a pele." },
    { name: "Luzes", price: "R$ 140,00", duration: "30 min", image: "assets/img/produtos-1.JPG", description: "Clareamento com acabamento premium." },
    { name: "Luzes + corte", price: "R$ 185,00", duration: "15 min", image: "assets/img/acao-3.JPG", description: "Luzes com corte de finalizacao." },
    { name: "Nevou", price: "R$ 160,00", duration: "60 min", image: "assets/img/acao-2.JPG", description: "Visual platinado com assinatura da casa." },
    { name: "Nevou + corte", price: "R$ 200,00", duration: "15 min", image: "assets/img/acao-4.JPG", description: "Nevou com corte para acabamento completo." },
    { name: "Selagem", price: "R$ 130,00", duration: "30 min", image: "assets/img/produtos-2.JPG", description: "Tratamento de alinhamento e acabamento dos fios." }
  ];
  const BARBERS = [
    { name: "Pablo", specialty: "Especialista em degrade e acabamento", rating: "4.9", image: "assets/img/pablo.jpg" },
    { name: "Marco", specialty: "Master barber em corte e barba", rating: "4.9", image: "assets/img/marco.jpg" }
  ];
  const SERVICE_CATEGORIES = [
    { name: "Cortes", icon: "01", services: ["Corte"] },
    { name: "Barba", icon: "02", services: ["Barba"] },
    {
      name: "Combos",
      icon: "03",
      services: [
        "Corte + barba",
        "Corte + barba + sobrancelha",
        "Corte + cavanhaque + sobrancelha",
        "Corte + hidrataÃ§Ã£o",
        "Luzes + corte",
        "Nevou + corte"
      ]
    },
    {
      name: "Tratamentos",
      icon: "04",
      services: ["HidrataÃ§Ã£o", "Limpeza de pele", "Luzes", "Nevou", "Selagem"]
    },
    { name: "Extras", icon: "05", services: ["Corte + sobrancelha"] },
    {
      name: "Assinaturas",
      icon: "06",
      services: ["Assinatura (corte e barba terapia)", "Assinatura corte"]
    }
  ];
  const WHATSAPP_NUMBER = "5500000000000";
  const SLOT_INTERVAL_MINUTES = 30;
  const WEEK_DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
  const MONTH_LABELS = [
    "Janeiro",
    "Fevereiro",
    "Marco",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"
  ];

  const state = {
    service: "",
    barber: "",
    date: "",
    time: "",
    step: "service",
    bookings: [],
    activeCategory: "Cortes",
    calendarMonth: new Date()
  };

  const STEP_META = {
    service: {
      count: "01 / 06",
      kicker: "Escolha o servico",
      title: "Qual ritual voce deseja agendar?",
      description: "Selecione uma experiencia premium para iniciar seu atendimento."
    },
    barber: {
      count: "02 / 06",
      kicker: "Escolha o profissional",
      title: "Quem vai assinar seu visual?",
      description: "Profissionais especialistas para entregar precisao e presenca."
    },
    date: {
      count: "03 / 06",
      kicker: "Escolha a data",
      title: "Quando voce quer viver o ritual?",
      description: "Escolha uma data disponivel para liberar os horarios."
    },
    time: {
      count: "04 / 06",
      kicker: "Escolha o horario",
      title: "Encontre seu momento ideal.",
      description: "Selecione um horario livre na agenda do profissional."
    },
    details: {
      count: "05 / 06",
      kicker: "Seus dados",
      title: "Dados para reservar.",
      description: "Informe nome e WhatsApp para finalizar sua reserva."
    },
    confirm: {
      count: "06 / 06",
      kicker: "Confirmacao",
      title: "Revise sua reserva.",
      description: "Confira o resumo e confirme para abrir o WhatsApp."
    }
  };
  const STEP_ORDER = ["service", "barber", "date", "time", "details", "confirm"];

  function toDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDate(value) {
    if (!value) return "Aguardando escolha";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  function minutesToTime(minutes) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
    const minute = String(minutes % 60).padStart(2, "0");
    return `${hour}:${minute}`;
  }

  function getServiceByName(name) {
    return SERVICES.find((service) => service.name === name);
  }

  function getCategoryForService(serviceName) {
    const category = SERVICE_CATEGORIES.find((item) => item.services.includes(serviceName));
    return category ? category.name : SERVICE_CATEGORIES[0].name;
  }

  function toCalendarMonth(value) {
    const date = value ? new Date(`${value}T12:00:00`) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function getBusinessHours(dateValue) {
    const day = new Date(`${dateValue}T12:00:00`).getDay();
    if (day === 0) return null;
    return {
      start: 9 * 60,
      end: day === 6 ? 19 * 60 : 20 * 60
    };
  }

  function generateSlots(dateValue) {
    const hours = getBusinessHours(dateValue);
    if (!hours) return [];

    const slots = [];
    for (let minutes = hours.start; minutes <= hours.end; minutes += SLOT_INTERVAL_MINUTES) {
      slots.push(minutesToTime(minutes));
    }
    return slots;
  }

  function isPastSlot(dateValue, timeValue) {
    const now = new Date();
    return new Date(`${dateValue}T${timeValue}:00`) <= now;
  }

  function isSlotTaken(dateValue, timeValue, barber) {
    return state.bookings.some((booking) => {
      return (
        booking.status === "confirmed" &&
        booking.date === dateValue &&
        booking.time === timeValue &&
        booking.barber === barber
      );
    });
  }

  function sanitizePhone(value) {
    return value.replace(/\D/g, "");
  }

  function normalizeText(value) {
    return value.trim().toLowerCase();
  }

  function bookingId() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `booking-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function setStatus(app, message, type = "info") {
    const status = app.querySelector("[data-booking-status]");
    status.textContent = message;
    status.dataset.type = type;
    status.classList.toggle("is-visible", Boolean(message));
  }

  function setLoading(button, isLoading) {
    button.classList.toggle("is-loading", isLoading);
    button.disabled = isLoading;
    button.innerHTML = isLoading ? "Confirmando..." : 'Confirmar agendamento <span aria-hidden="true">→</span>';
  }

  function updateSteps(app) {
    const meta = STEP_META[state.step];
    app.dataset.bookingStep = state.step;
    app.querySelector("[data-booking-count]").textContent = meta.count;
    app.querySelector("[data-booking-kicker]").textContent = meta.kicker;
    app.querySelector("[data-booking-title]").textContent = meta.title;
    app.querySelector("[data-booking-description]").textContent = meta.description;
  }

  function setStep(app, step) {
    state.step = step;
    const activeIndex = STEP_ORDER.indexOf(step);
    app.querySelectorAll("[data-booking-stage]").forEach((stage) => {
      const stageIndex = STEP_ORDER.indexOf(stage.dataset.bookingStage);
      const isUnlocked = stageIndex <= activeIndex;
      stage.classList.toggle("is-active", isUnlocked);
      stage.classList.toggle("is-current", stage.dataset.bookingStage === step);
      stage.classList.toggle("is-complete", stageIndex < activeIndex);
    });
    const activeStage = app.querySelector(`[data-booking-stage="${step}"]`);
    if (activeStage && step !== "service") {
      activeStage.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    updateSteps(app);
  }

  function updateSummary(app) {
    app.querySelectorAll("[data-summary-service]").forEach((item) => {
      item.textContent = state.service || "Servico";
    });
    app.querySelectorAll("[data-summary-barber]").forEach((item) => {
      item.textContent = state.barber || "Barbeiro";
    });
    app.querySelectorAll("[data-summary-date]").forEach((item) => {
      item.textContent = state.date ? formatDate(state.date) : "Data";
    });
    app.querySelectorAll("[data-summary-time]").forEach((item) => {
      item.textContent = state.time || "Horario";
    });
    updateSteps(app);
  }

  function renderChoices(app) {
    const serviceOptions = app.querySelector("[data-service-options]");
    const barberOptions = app.querySelector("[data-barber-options]");

    serviceOptions.innerHTML = SERVICES.map((service, index) => {
      const active = state.service === service.name ? " is-selected" : "";
      return `<button class="cinema-service${active}" type="button" data-service="${service.name}" style="--item-index:${index}">
        <img src="${service.image}" alt="" loading="lazy" />
        <span class="cinema-service__icon">IB</span>
        <span class="cinema-service__name text-3d gold-depth">${service.name}</span>
        <span class="cinema-service__meta">${service.price} · ${service.duration}</span>
        <small>${service.description}</small>
      </button>`;
    }).join("");

    serviceOptions.innerHTML = SERVICE_CATEGORIES.map((category) => {
      const categoryServices = category.services.map(getServiceByName).filter(Boolean);
      const isOpen = state.activeCategory === category.name;
      const hasSelected = categoryServices.some((service) => service.name === state.service);
      const openClass = isOpen ? " is-open" : "";
      const selectedClass = hasSelected ? " has-selected" : "";
      const items = categoryServices.map((service, index) => {
        const active = state.service === service.name ? " is-selected" : "";
        return `<button class="service-row${active}" type="button" data-service="${service.name}" data-service-category="${category.name}" style="--item-index:${index}">
          <img src="${service.image}" alt="" loading="lazy" />
          <span class="service-row__body">
            <strong class="text-3d title-depth">${service.name}</strong>
            <small>${service.duration}</small>
          </span>
          <span class="service-row__price">${service.price}</span>
          <span class="service-row__select">Selecionar</span>
        </button>`;
      }).join("");

      return `<article class="service-category${openClass}${selectedClass}">
        <button class="service-category__head" type="button" data-service-category="${category.name}" aria-expanded="${isOpen}">
          <span class="service-category__icon">${category.icon}</span>
          <span class="service-category__title">
            <strong class="text-3d gold-depth">${category.name}</strong>
            <small>${categoryServices.length} servico${categoryServices.length > 1 ? "s" : ""}</small>
          </span>
          <span class="service-category__toggle" aria-hidden="true"></span>
        </button>
        <div class="service-category__panel">${items}</div>
      </article>`;
    }).join("");

    barberOptions.innerHTML = BARBERS.map((barber) => {
      const active = state.barber === barber.name ? " is-selected" : "";
      return `<button class="barber-select${active}" type="button" data-barber="${barber.name}">
        <img src="${barber.image}" alt="${barber.name}, barbeiro da Invictus Barber" loading="lazy" />
        <span class="text-3d gold-depth">${barber.name}</span>
        <small>${barber.specialty}</small>
        <strong>★★★★★ ${barber.rating}</strong>
      </button>`;
    }).join("");
  }

  function renderSlots(app) {
    const board = app.querySelector("[data-slot-board]");
    if (!state.date || !state.barber) {
      board.innerHTML = "<p>Escolha uma data para revelar os horarios.</p>";
      return;
    }

    const today = toDateInputValue(new Date());
    if (state.date < today) {
      state.time = "";
      board.innerHTML = "<p>Datas passadas nao podem ser agendadas.</p>";
      return;
    }

    const slots = generateSlots(state.date);
    if (!slots.length) {
      state.time = "";
      board.innerHTML = "<p>Domingo a casa descansa. Escolha outra data.</p>";
      return;
    }

    board.innerHTML = slots.map((slot) => {
      const unavailable = isPastSlot(state.date, slot) || isSlotTaken(state.date, slot, state.barber);
      const selected = state.time === slot ? " is-selected" : "";
      const disabled = unavailable ? " disabled" : "";
      return `<button class="timeline-slot${selected}" type="button" data-slot="${slot}"${disabled}>${slot}</button>`;
    }).join("");

    if (state.time && !board.querySelector(`[data-slot="${state.time}"]:not(:disabled)`)) {
      state.time = "";
    }
  }

  function renderCalendar(app) {
    const calendar = app.querySelector("[data-booking-calendar]");
    if (!calendar) return;

    const month = state.calendarMonth;
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const todayValue = toDateInputValue(new Date());
    const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();
    const previousDisabled = month <= currentMonth ? " disabled" : "";

    const blanks = Array.from({ length: firstDay }, () => '<span class="calendar-empty" aria-hidden="true"></span>').join("");
    const days = Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1;
      const date = new Date(year, monthIndex, day);
      const value = toDateInputValue(date);
      const closed = date.getDay() === 0;
      const past = value < todayValue;
      const hasSlots = !closed && !past && generateSlots(value).some((slot) => {
        return !isPastSlot(value, slot) && !isSlotTaken(value, slot, state.barber);
      });
      const disabled = closed || past || !hasSlots ? " disabled" : "";
      const selected = state.date === value ? " is-selected" : "";
      const status = closed ? "Fechado" : past ? "Indisponivel" : hasSlots ? "Disponivel" : "Lotado";

      return `<button class="calendar-day${selected}" type="button" data-calendar-day="${value}"${disabled}>
        <span>${day}</span>
        <small>${status}</small>
      </button>`;
    }).join("");

    calendar.innerHTML = `<div class="calendar-head">
      <button type="button" data-calendar-prev aria-label="Mes anterior"${previousDisabled}>‹</button>
      <strong>${MONTH_LABELS[monthIndex]} ${year}</strong>
      <button type="button" data-calendar-next aria-label="Proximo mes">›</button>
    </div>
    <div class="calendar-week">${WEEK_DAYS.map((day) => `<span>${day}</span>`).join("")}</div>
    <div class="calendar-grid">${blanks}${days}</div>`;
  }

  function validateForm(form) {
    const formData = new FormData(form);
    const clientName = String(formData.get("clientName") || "").trim();
    const clientWhatsapp = String(formData.get("clientWhatsapp") || "").trim();
    const clientEmail = String(formData.get("clientEmail") || "nao informado").trim();

    if (!state.service) return { error: "Escolha um servico para continuar." };
    if (!state.barber) return { error: "Escolha Pablo ou Marco para abrir a agenda." };
    if (!state.date) return { error: "Escolha uma data disponivel." };
    if (state.date < toDateInputValue(new Date())) return { error: "Nao e possivel agendar uma data passada." };
    if (!getBusinessHours(state.date)) return { error: "Domingo estamos fechados. Escolha outra data." };
    if (!state.time) return { error: "Escolha um horario disponivel." };
    if (isSlotTaken(state.date, state.time, state.barber)) return { error: "Esse horario acabou de ser reservado. Escolha outro." };
    if (!clientName) return { error: "Informe seu nome para confirmar." };
    if (sanitizePhone(clientWhatsapp).length < 10) return { error: "Informe um WhatsApp valido." };

    return {
      data: {
        service: state.service,
        barber: state.barber,
        clientName,
        clientWhatsapp,
        clientEmail,
        date: state.date,
        time: state.time
      }
    };
  }

  function hasDuplicateClientBooking(data) {
    const phone = sanitizePhone(data.clientWhatsapp);
    const email = normalizeText(data.clientEmail);

    return state.bookings.some((booking) => {
      const sameEmail = email !== "nao informado" && normalizeText(booking.clientEmail) === email;
      return (
        booking.status === "confirmed" &&
        booking.date === data.date &&
        booking.time === data.time &&
        booking.barber === data.barber &&
        (sanitizePhone(booking.clientWhatsapp) === phone || sameEmail)
      );
    });
  }

  function getWhatsappUrl(booking) {
    const message = [
      "Olá, meu agendamento na Invictus Barber foi confirmado.",
      `Serviço: ${booking.service}`,
      `Barbeiro: ${booking.barber}`,
      `Data: ${formatDate(booking.date)}`,
      `Horário: ${booking.time}`
    ].join("\n");

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  function openWhatsapp(booking, targetWindow) {
    const url = getWhatsappUrl(booking);
    if (targetWindow && !targetWindow.closed) {
      targetWindow.location.href = url;
      return;
    }
    window.open(url, "_blank", "noopener");
  }

  async function setupBooking() {
    const app = document.querySelector("[data-booking-app]");
    if (!app || !window.InvictusStorage) return;

    const form = app.querySelector("[data-booking-concierge]");
    const dateInput = app.querySelector("[data-booking-date]");
    const submitButton = app.querySelector("[data-booking-submit]");

    state.bookings = await window.InvictusStorage.listBookings();
    dateInput.min = toDateInputValue(new Date());
    renderChoices(app);
    renderCalendar(app);
    renderSlots(app);
    setStep(app, "service");
    updateSummary(app);

    app.addEventListener("click", (event) => {
      const categoryButton = event.target.closest(".service-category__head[data-service-category]");
      const serviceButton = event.target.closest("[data-service]");
      const barberButton = event.target.closest("[data-barber]");
      const slotButton = event.target.closest("[data-slot]");
      const calendarDay = event.target.closest("[data-calendar-day]");
      const calendarPrev = event.target.closest("[data-calendar-prev]");
      const calendarNext = event.target.closest("[data-calendar-next]");
      const completedHeader = event.target.closest(".booking-screen.is-complete .booking-screen__top");

      if (completedHeader) {
        const completedStage = completedHeader.closest("[data-booking-stage]");
        if (completedStage) {
          setStep(app, completedStage.dataset.bookingStage);
        }
        return;
      }

      if (categoryButton) {
        state.activeCategory = categoryButton.dataset.serviceCategory;
        renderChoices(app);
        return;
      }

      if (serviceButton) {
        state.service = serviceButton.dataset.service;
        state.activeCategory = getCategoryForService(state.service);
        state.barber = "";
        state.date = "";
        state.time = "";
        dateInput.value = "";
        state.calendarMonth = toCalendarMonth();
        setStatus(app, "Servico selecionado. Agora escolha seu barbeiro.", "info");
        renderChoices(app);
        renderCalendar(app);
        renderSlots(app);
        setStep(app, "barber");
      }

      if (barberButton) {
        state.barber = barberButton.dataset.barber;
        state.time = "";
        setStatus(app, "Profissional escolhido. Agora selecione a data.", "info");
        renderChoices(app);
        renderCalendar(app);
        renderSlots(app);
        setStep(app, "date");
      }

      if (calendarPrev && !calendarPrev.disabled) {
        state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() - 1, 1);
        renderCalendar(app);
      }

      if (calendarNext) {
        state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1);
        renderCalendar(app);
      }

      if (calendarDay && !calendarDay.disabled) {
        state.date = calendarDay.dataset.calendarDay;
        state.time = "";
        dateInput.value = state.date;
        setStatus(app, "Data escolhida. Selecione um horario disponivel.", "info");
        renderCalendar(app);
        renderSlots(app);
        setStep(app, "time");
      }

      if (slotButton && !slotButton.disabled) {
        state.time = slotButton.dataset.slot;
        setStatus(app, "Horario selecionado. Informe seus dados.", "info");
        renderSlots(app);
        setStep(app, "details");
      }

      updateSummary(app);
    });

    dateInput.addEventListener("change", () => {
      state.date = dateInput.value;
      state.time = "";
      state.calendarMonth = toCalendarMonth(state.date);
      setStatus(app, state.date ? "Horarios atualizados para a data escolhida." : "", "info");
      renderCalendar(app);
      renderSlots(app);
      if (state.date) {
        setStep(app, "time");
      }
      updateSummary(app);
    });

    form.addEventListener("input", () => {
      if (state.step !== "details") return;
      const formData = new FormData(form);
      const clientName = String(formData.get("clientName") || "").trim();
      const clientWhatsapp = String(formData.get("clientWhatsapp") || "").trim();

      if (clientName.length >= 2 && sanitizePhone(clientWhatsapp).length >= 10) {
        setStatus(app, "Dados recebidos. Revise e confirme sua reserva.", "info");
        setStep(app, "confirm");
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const validation = validateForm(form);

      if (validation.error) {
        setStatus(app, validation.error, "error");
        return;
      }

      if (hasDuplicateClientBooking(validation.data)) {
        setStatus(app, "Esse agendamento ja existe para seus dados. Revise o resumo.", "error");
        return;
      }

      setLoading(submitButton, true);
      setStatus(app, "Confirmando sua reserva premium...", "info");
      const whatsappWindow = window.open("about:blank", "_blank");

      window.setTimeout(async () => {
        const booking = {
          id: bookingId(),
          ...validation.data,
          status: "confirmed",
          createdAt: new Date().toISOString()
        };

        await window.InvictusStorage.saveBooking(booking);
        state.bookings = await window.InvictusStorage.listBookings();
        setLoading(submitButton, false);
        setStatus(app, "Agendamento confirmado. Abrindo WhatsApp com os detalhes.", "success");
        renderSlots(app);
        openWhatsapp(booking, whatsappWindow);
      }, 650);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupBooking);
  } else {
    setupBooking();
  }
})();
