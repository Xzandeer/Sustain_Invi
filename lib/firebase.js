import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAfAbFbC8kYWLwGW_fKJkGf2gKGXSGEc10",
  authDomain: "sustain-inventory.firebaseapp.com",
  projectId: "sustain-inventory",
  storageBucket: "sustain-inventory.firebasestorage.app",
  messagingSenderId: "938566401352",
  appId: "1:938566401352:web:6256eb0f2c028d8e3f477d",
  measurementId: "G-LHZ8KX6EBZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore database
export const db = getFirestore(app);

// Export Authentication
export const auth = getAuth(app);
