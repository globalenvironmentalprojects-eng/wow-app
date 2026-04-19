import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyDr9JM-C4M6e8h72jcituqLouIe2lohhZU",
  authDomain: "wow-wine.firebaseapp.com",
  projectId: "wow-wine",
  storageBucket: "wow-wine.firebasestorage.app",
  messagingSenderId: "799292221607",
  appId: "1:799292221607:web:45173fe9ce573261b45382"
};

// Initialize Firebase


export const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);
export const auth = getAuth(app);