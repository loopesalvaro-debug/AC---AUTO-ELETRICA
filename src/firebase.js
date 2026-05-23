import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBAyd5HAKM-01AJJ5qLU6KZ1sgxMUa97CQ",
  authDomain: "ac---auto-eletrica.firebaseapp.com",
  projectId: "ac---auto-eletrica",
  storageBucket: "ac---auto-eletrica.firebasestorage.app",
  messagingSenderId: "243780919959",
  appId: "1:243780919959:web:099080cfdf689c6dcbffd2"
};

const missing = Object.entries(firebaseConfig).filter(([, value]) => !value);
if (missing.length) {
  console.warn("Variáveis Firebase ausentes:", missing.map(([key]) => key));
}

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
