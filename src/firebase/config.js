import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Function for anonymous login
export const loginAnonymously = async () => {
  try {
    if (auth.currentUser) {
      console.log("Already logged in anonymously:", auth.currentUser.uid);
      return auth.currentUser;
    }
    const userCredential = await signInAnonymously(auth);
    console.log("Logged in anonymously:", userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error("Error with anonymous login:", error.code, error.message);
    throw error;
  }
};

export { auth, db };
