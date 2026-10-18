import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForPreviewModeOnly",
  authDomain: "ai-studio-lhlclassrankingt-83560724-b04d-433b-b1de-904dc275f188.firebaseapp.com",
  projectId: "ai-studio-lhlclassrankingt-83560724-b04d-433b-b1de-904dc275f188",
  storageBucket: "ai-studio-lhlclassrankingt-83560724-b04d-433b-b1de-904dc275f188.appspot.com",
  messagingSenderId: "735479914175",
  appId: "1:735479914175:web:abcdef",
  firestoreDatabaseId: "(default)"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();
