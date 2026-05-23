import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuração Firebase enviada por você.
// Esta versão NÃO usa Firebase Storage, então não precisa fazer upgrade do projeto.
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
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
