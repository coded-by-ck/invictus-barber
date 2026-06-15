const FIREBASE_VERSION = "10.12.5";
const NOTIFICATION_TOKENS_COLLECTION = "notificationTokens";

// Colar aqui a Web Push certificate key gerada em Firebase Console > Cloud Messaging.
const FIREBASE_WEB_PUSH_VAPID_KEY = "BFgsVAHOwt2tATC_yYpCxnetyCFXXQybW404HE9SWBIdoxCdbihDD29MXNNp3cDfizKkp7njZrqOhZk_zq_v10U";

const firebaseConfig = {
  apiKey: "AIzaSyAG57hdHjjhlrTChXQ0OBXkvKrtcTrI5P8",
  authDomain: "invictus-barber-6c32d.firebaseapp.com",
  projectId: "invictus-barber-6c32d",
  storageBucket: "invictus-barber-6c32d.firebasestorage.app",
  messagingSenderId: "319574861719",
  appId: "1:319574861719:web:20bb3e3ac67ee66f6cc6d2",
  measurementId: "G-6GSES2BZKK"
};

function hasNotificationSupport() {
  return "Notification" in window &&
    "serviceWorker" in navigator &&
    window.isSecureContext;
}

function hasConfiguredVapidKey() {
  return FIREBASE_WEB_PUSH_VAPID_KEY &&
    FIREBASE_WEB_PUSH_VAPID_KEY !== "COLE_AQUI_SUA_VAPID_KEY";
}

function getUserAgent() {
  return String(navigator.userAgent || "").slice(0, 240);
}

function nowIso() {
  return new Date().toISOString();
}

async function tokenDocumentId(token) {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getStoredTokenKey(scope) {
  return `invictus_notification_token_${scope}`;
}

async function loadFirebaseModules() {
  const [appModule, firestoreModule, messagingModule] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-messaging.js`)
  ]);

  const app = appModule.getApps().length ? appModule.getApps()[0] : appModule.initializeApp(firebaseConfig);
  const db = firestoreModule.getFirestore(app);

  return {
    app,
    db,
    doc: firestoreModule.doc,
    getToken: messagingModule.getToken,
    getMessaging: messagingModule.getMessaging,
    isSupported: messagingModule.isSupported,
    onMessage: messagingModule.onMessage,
    serverTimestamp: firestoreModule.serverTimestamp,
    setDoc: firestoreModule.setDoc,
    updateDoc: firestoreModule.updateDoc
  };
}

async function ensureReady() {
  if (!hasNotificationSupport()) {
    throw new Error("Este navegador nao suporta notificacoes Web Push neste contexto. Use HTTPS e um navegador compativel.");
  }

  if (!hasConfiguredVapidKey()) {
    throw new Error("A VAPID key do Firebase Cloud Messaging ainda nao foi configurada.");
  }

  const modules = await loadFirebaseModules();
  const supported = await modules.isSupported();
  if (!supported) {
    throw new Error("Firebase Messaging nao e suportado neste navegador.");
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  return { ...modules, registration };
}

async function requestBrowserPermission() {
  if (Notification.permission === "granted") return;
  if (Notification.permission === "denied") {
    throw new Error("As notificacoes estao bloqueadas neste navegador.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permissao de notificacao nao concedida.");
  }
}

function tokenPayload(context, token) {
  const basePayload = {
    token,
    userType: context.userType,
    active: true,
    updatedAt: nowIso(),
    userAgent: getUserAgent()
  };

  if (context.uid) basePayload.uid = context.uid;
  if (context.barberId) basePayload.barberId = context.barberId;
  if (context.bookingId) basePayload.bookingId = context.bookingId;
  if (context.cancelTokenId) basePayload.cancelTokenId = context.cancelTokenId;

  return basePayload;
}

function scopeForContext(context) {
  if (context.userType === "admin") return `admin_${context.uid || "anon"}`;
  if (context.userType === "barber") return `barber_${context.uid || context.barberId || "anon"}`;
  return `client_${context.bookingId || context.cancelTokenId || "anon"}`;
}

async function deactivatePreviousToken(modules, scope, nextTokenId) {
  const storageKey = getStoredTokenKey(scope);
  const previousTokenId = window.localStorage.getItem(storageKey);

  if (!previousTokenId || previousTokenId === nextTokenId) {
    window.localStorage.setItem(storageKey, nextTokenId);
    return;
  }

  try {
    await modules.updateDoc(modules.doc(modules.db, NOTIFICATION_TOKENS_COLLECTION, previousTokenId), {
      active: false,
      updatedAt: nowIso()
    });
  } catch (error) {
    console.info("Token de notificacao anterior nao pode ser desativado.", error);
  }

  window.localStorage.setItem(storageKey, nextTokenId);
}

let foregroundMessagesReady = false;

function setupForegroundMessages(modules, messaging) {
  if (foregroundMessagesReady) return;
  foregroundMessagesReady = true;

  modules.onMessage(messaging, (payload) => {
    if (Notification.permission !== "granted") return;

    const notification = payload.notification || {};
    const data = payload.data || {};
    const title = notification.title || data.title || "Invictus Barber";
    const body = notification.body || data.body || "";
    const browserNotification = new Notification(title, {
      body,
      icon: "/assets/img/logotipo-in.png",
      data: {
        url: data.url || "/"
      }
    });

    browserNotification.onclick = () => {
      browserNotification.close();
      window.focus();
      if (browserNotification.data && browserNotification.data.url) {
        window.location.assign(browserNotification.data.url);
      }
    };
  });
}

async function enable(context) {
  const modules = await ensureReady();
  await requestBrowserPermission();
  const messaging = modules.getMessaging(modules.app);
  setupForegroundMessages(modules, messaging);
  const token = await modules.getToken(messaging, {
    vapidKey: FIREBASE_WEB_PUSH_VAPID_KEY,
    serviceWorkerRegistration: modules.registration
  });

  if (!token) {
    throw new Error("Nao foi possivel obter o token de notificacao.");
  }

  const scope = scopeForContext(context);
  const tokenId = await tokenDocumentId(`${scope}:${token}`);
  await deactivatePreviousToken(modules, scope, tokenId);

  await modules.setDoc(modules.doc(modules.db, NOTIFICATION_TOKENS_COLLECTION, tokenId), {
    ...tokenPayload(context, token),
    createdAt: nowIso()
  }, { merge: true });

  return { tokenId };
}

function supportStatus() {
  if (!hasNotificationSupport()) {
    return {
      supported: false,
      reason: "Este navegador nao suporta notificacoes neste contexto. Use HTTPS e um navegador compativel."
    };
  }

  if (!hasConfiguredVapidKey()) {
    return {
      supported: false,
      reason: "A VAPID key do Firebase Cloud Messaging ainda nao foi configurada."
    };
  }

  return {
    supported: true,
    permission: Notification.permission
  };
}

window.InvictusNotifications = {
  enable,
  supportStatus
};
