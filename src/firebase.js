import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuração enviada por você.
// Está fixa no código para evitar erro projects/undefined.
const firebaseConfig = {
  apiKey: "AIzaSyBAyd5HAKM-01AJJ5qLU6KZ1sgxMUa97CQ",
  authDomain: "ac---auto-eletrica.firebaseapp.com",
  projectId: "ac---auto-eletrica",
  storageBucket: "ac---auto-eletrica.firebasestorage.app",
  messagingSenderId: "243780919959",
  appId: "1:243780919959:web:099080cfdf689c6dcbffd2"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
