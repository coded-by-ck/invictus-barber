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

function hasFirebaseConfig(config) {
  return Object.values(config).every((value) => {
    return typeof value === "string" && value.trim() && !value.includes("COLE_");
  });
}

window.InvictusFirebase = {
  ready: Promise.resolve(null),
  db: null,
  app: null,
  analytics: null,
  modules: {}
};

if (hasFirebaseConfig(firebaseConfig)) {
  window.InvictusFirebase.ready = Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-analytics.js`)
  ])
    .then(([appModule, firestoreModule, analyticsModule]) => {
      const app = appModule.initializeApp(firebaseConfig);
      const db = firestoreModule.getFirestore(app);

      window.InvictusFirebase.app = app;
      window.InvictusFirebase.db = db;
      window.InvictusFirebase.modules = {
        collection: firestoreModule.collection,
        doc: firestoreModule.doc,
        getDoc: firestoreModule.getDoc,
        getDocs: firestoreModule.getDocs,
        query: firestoreModule.query,
        runTransaction: firestoreModule.runTransaction,
        setDoc: firestoreModule.setDoc,
        where: firestoreModule.where
      };

      analyticsModule.isSupported()
        .then((supported) => {
          if (supported) {
            window.InvictusFirebase.analytics = analyticsModule.getAnalytics(app);
          }
        })
        .catch((error) => {
          console.info("Firebase Analytics nao iniciou neste ambiente.", error);
        });

      return db;
    })
    .catch((error) => {
      console.warn("Firebase nao iniciou. O site usara localStorage.", error);
      window.InvictusFirebase.db = null;
      return null;
    });
} else {
  console.info("Firebase sem credenciais. Cole o firebaseConfig real em assets/js/firebase-config.js.");
}
