import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, addDoc, deleteDoc, updateDoc } from "firebase/firestore";

// Safe import of configuration
const firebaseConfig = {
  apiKey: "AIzaSyCX_0-wMugXGFcDY9iEyAgLvTYFG7lZT3c",
  authDomain: "buoyant-edition-nn50x.firebaseapp.com",
  projectId: "buoyant-edition-nn50x",
  storageBucket: "buoyant-edition-nn50x.firebasestorage.app",
  messagingSenderId: "903256837116",
  appId: "1:903256837116:web:37c5dcac22f192ffb28079"
};

const app = initializeApp(firebaseConfig);

// Use custom firestoreDatabaseId if configured
export const db = getFirestore(app, "ai-studio-smartspend-6cb9a085-0276-4ea2-8bbf-3e8b1a2b791d");
export { collection, doc, getDoc, setDoc, getDocs, addDoc, deleteDoc, updateDoc };
