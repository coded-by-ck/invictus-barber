const FIREBASE_VERSION = "10.12.5";

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

const form = document.querySelector("[data-admin-login]");
const submitButton = document.querySelector("[data-login-submit]");
const status = document.querySelector("[data-login-status]");

function setStatus(message, type = "info") {
  status.textContent = message;
  status.dataset.type = type;
}

function getRedirectForProfile(profile) {
  if (profile.role === "admin") return "master.html";
  if (profile.role === "barber") return "painel.html";
  return "";
}

async function getAdminProfile(uid) {
  const profileRef = firestoreModule.doc(db, "users", uid);
  const profile = await firestoreModule.getDoc(profileRef);
  if (!profile.exists()) return null;

  const data = profile.data();
  if (data.role === "admin") {
    return {
      uid,
      role: data.role,
      name: data.name || "Administrador"
    };
  }

  if (data.role !== "barber" || !data.barberId) return null;

  return {
    uid,
    role: data.role,
    barberId: data.barberId,
    name: data.name || data.barberName || data.barberId
  };
}

authModule.onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  try {
    const profile = await getAdminProfile(user.uid);
    if (!profile) return;
    const redirectTo = getRedirectForProfile(profile);
    if (!redirectTo) return;
    window.sessionStorage.setItem("invictus_admin_profile", JSON.stringify(profile));
    window.location.replace(redirectTo);
  } catch (error) {
    console.warn("Nao foi possivel validar o perfil administrativo.", error);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    setStatus("Informe email e senha.", "error");
    return;
  }

  submitButton.disabled = true;
  setStatus("Validando acesso...", "info");

  try {
    const credential = await authModule.signInWithEmailAndPassword(auth, email, password);
    const profile = await getAdminProfile(credential.user.uid);
    const redirectTo = profile ? getRedirectForProfile(profile) : "";

    if (!profile || !redirectTo) {
      await authModule.signOut(auth);
      setStatus("Usuario sem perfil administrativo configurado.", "error");
      return;
    }

    window.sessionStorage.setItem("invictus_admin_profile", JSON.stringify(profile));
    setStatus("Acesso liberado.", "success");
    window.location.assign(redirectTo);
  } catch (error) {
    console.warn("Falha no login do painel.", error);
    setStatus("Email, senha ou permissao invalidos.", "error");
  } finally {
    submitButton.disabled = false;
  }
});
