const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { logger } = require("firebase-functions");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

const BOOKINGS_COLLECTION = "bookings";
const NOTIFICATION_TOKENS_COLLECTION = "notificationTokens";
const reminderMinutes = 30;
const reminderWindowMinutes = 5;
const businessTimezone = "America/Campo_Grande";

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function bookingLabel(booking) {
  return `${formatDate(booking.date)} as ${booking.time || "-"}`;
}

function compactText(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function notificationUrlForUserType(userType) {
  if (userType === "admin") return "/admin/master.html";
  if (userType === "barber") return "/admin/painel.html";
  return "/";
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function isInvalidTokenError(errorCode) {
  return [
    "messaging/invalid-registration-token",
    "messaging/registration-token-not-registered"
  ].includes(errorCode);
}

async function getActiveTokensByUserType(userType) {
  const snapshot = await db.collection(NOTIFICATION_TOKENS_COLLECTION)
    .where("userType", "==", userType)
    .where("active", "==", true)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
}

async function getBookingAudience(booking, includeClient = false) {
  const [barberTokens, adminTokens, clientTokens] = await Promise.all([
    getActiveTokensByUserType("barber"),
    getActiveTokensByUserType("admin"),
    includeClient ? getActiveTokensByUserType("client") : Promise.resolve([])
  ]);

  const barberId = String(booking.barberId || "");
  const bookingId = String(booking.id || "");

  return [
    ...barberTokens.filter((item) => item.barberId === barberId),
    ...adminTokens,
    ...clientTokens.filter((item) => item.bookingId === bookingId)
  ];
}

async function deactivateTokens(tokenDocs) {
  if (!tokenDocs.length) return;

  const batches = chunk(tokenDocs, 450).map(async (tokenChunk) => {
    const batch = db.batch();
    tokenChunk.forEach((tokenDoc) => {
      batch.update(db.collection(NOTIFICATION_TOKENS_COLLECTION).doc(tokenDoc.id), {
        active: false,
        updatedAt: new Date().toISOString(),
        deactivatedAt: FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
  });

  await Promise.all(batches);
}

async function sendPushToTokens(tokenDocs, notification, data = {}) {
  const validTokenDocs = tokenDocs.filter((item) => item.token);
  if (!validTokenDocs.length) return 0;

  let sentCount = 0;
  const invalidTokenDocs = [];

  for (const tokenChunk of chunk(validTokenDocs, 500)) {
    const response = await messaging.sendEachForMulticast({
      tokens: tokenChunk.map((item) => item.token),
      notification,
      data: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value || "")])
      ),
      webpush: {
        fcmOptions: {
          link: data.url || "/"
        },
        notification: {
          icon: "/assets/img/logotipo-in.png",
          badge: "/assets/img/logotipo-in.png"
        }
      }
    });

    sentCount += response.successCount;
    response.responses.forEach((result, index) => {
      if (!result.success && isInvalidTokenError(result.error && result.error.code)) {
        invalidTokenDocs.push(tokenChunk[index]);
      }
    });
  }

  await deactivateTokens(invalidTokenDocs);
  return sentCount;
}

async function notifyBookingAudience(booking, notification) {
  const audience = await getBookingAudience(booking);
  const groups = new Map();

  audience.forEach((tokenDoc) => {
    const url = notificationUrlForUserType(tokenDoc.userType);
    const current = groups.get(url) || [];
    current.push(tokenDoc);
    groups.set(url, current);
  });

  let sentCount = 0;
  for (const [url, tokenDocs] of groups.entries()) {
    sentCount += await sendPushToTokens(tokenDocs, notification, {
      bookingId: booking.id,
      barberId: booking.barberId,
      url
    });
  }

  return sentCount;
}

function zonedDateTimeKey(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: businessTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function bookingDateTimeKey(booking) {
  return `${booking.date || ""} ${booking.time || ""}`;
}

function bookingStartsInsideReminderWindow(booking, now = new Date()) {
  const startsAt = bookingDateTimeKey(booking);
  const windowStart = zonedDateTimeKey(new Date(now.getTime() + reminderMinutes * 60 * 1000));
  const windowEnd = zonedDateTimeKey(new Date(now.getTime() + (reminderMinutes + reminderWindowMinutes) * 60 * 1000));

  return startsAt >= windowStart && startsAt < windowEnd;
}

exports.onBookingCreated = onDocumentCreated(`${BOOKINGS_COLLECTION}/{bookingId}`, async (event) => {
  const booking = {
    id: event.params.bookingId,
    ...event.data.data()
  };

  if (booking.status !== "confirmed") return;

  const clientName = compactText(booking.clientName, "Cliente");
  const service = compactText(booking.service, "Servico");

  const sentCount = await notifyBookingAudience(booking, {
    title: "Novo agendamento",
    body: `${clientName} agendou ${service} para ${bookingLabel(booking)}.`
  });

  logger.info("Notificacao de novo agendamento enviada.", {
    bookingId: booking.id,
    sentCount
  });
});

exports.onBookingCancelled = onDocumentUpdated(`${BOOKINGS_COLLECTION}/{bookingId}`, async (event) => {
  const before = event.data.before.data();
  const after = {
    id: event.params.bookingId,
    ...event.data.after.data()
  };

  if (before.status === "cancelled" || after.status !== "cancelled") return;

  const clientName = compactText(after.clientName, "Cliente");
  const service = compactText(after.service, "Servico");

  const sentCount = await notifyBookingAudience(after, {
    title: "Agendamento cancelado",
    body: `${clientName} cancelou ${service} de ${bookingLabel(after)}.`
  });

  logger.info("Notificacao de cancelamento enviada.", {
    bookingId: after.id,
    sentCount
  });
});

exports.scheduledReminder = onSchedule({
  schedule: "every 5 minutes",
  timeZone: businessTimezone
}, async () => {
  const snapshot = await db.collection(BOOKINGS_COLLECTION)
    .where("status", "==", "confirmed")
    .get();

  const reminderCandidates = snapshot.docs
    .map((doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() }))
    .filter((booking) => !booking.reminder30SentAt)
    .filter((booking) => bookingStartsInsideReminderWindow(booking));

  for (const booking of reminderCandidates) {
    const clientTokens = (await getActiveTokensByUserType("client"))
      .filter((item) => item.bookingId === booking.id);

    const sentCount = await sendPushToTokens(clientTokens, {
      title: "Lembrete Invictus Barber",
      body: "Seu horario na Invictus Barber e daqui 30 minutos."
    }, {
      bookingId: booking.id,
      url: "/meus-agendamentos.html"
    });

    await booking.ref.update({
      reminder30SentAt: FieldValue.serverTimestamp(),
      reminderMinutesSent: reminderMinutes,
      updatedAt: new Date().toISOString()
    });

    logger.info("Lembrete de cliente processado.", {
      bookingId: booking.id,
      sentCount,
      reminderMinutes
    });
  }
});
