import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; //* for Cloud Firestore

// Adicione aqui as suas credenciais do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBCKI5dZJ6QOSgc82-aoydEo7U2H6II74U",
  authDomain: "biblioteca-f424c.firebaseapp.com",
  projectId: "biblioteca-f424c",
  storageBucket: "biblioteca-f424c.appspot.com",
  messagingSenderId: "725292476936",
  appId: "1:725292476936:web:60bf41756495665c4b3fbd"
};
// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
