// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyCpW-PxHIo9FQ0IIspMhBW6Sc0VN6l15f4",
  authDomain: "neneplhl.firebaseapp.com",
  projectId: "neneplhl",
  storageBucket: "neneplhl.firebasestorage.app",
  messagingSenderId: "879961923597",
  appId: "1:879961923597:web:753b8273faf2e9ac8cf544",
  measurementId: "G-VTQ7BYWZ4R"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

export let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

export default firebaseConfig;
