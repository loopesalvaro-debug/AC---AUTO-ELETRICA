import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuração fixa informada pelo usuário.
// Esta versão NÃO usa Firebase Storage.
export const firebaseConfig = {
  apiKey: "AIzaSyBAyd5HAKM-01AJJ5qLU6KZ1sgxMUa97CQ",
  authDomain: "ac---auto-eletrica.firebaseapp.com",
  projectId: "ac---auto-eletrica",
  storageBucket: "ac---auto-eletrica.firebasestorage.app",
  messagingSenderId: "243780919959",
  appId: "1:243780919959:web:099080cfdf689c6dcbffd2"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const firebaseProjectId = firebaseConfig.projectId;
