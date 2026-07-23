import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCwrNqEsRViVRLLHO5qRXYAPyK_HlmPjAE",
  authDomain: "xabarchi-uz.firebaseapp.com",
  projectId: "xabarchi-uz",
  storageBucket: "xabarchi-uz.firebasestorage.app",
  messagingSenderId: "778311994480",
  appId: "1:778311994480:web:bc0ca0d8bfab26b8c538b5",
  measurementId: "G-E5Z84EEMLP",
};

export const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { RecaptchaVerifier, signInWithPhoneNumber };
