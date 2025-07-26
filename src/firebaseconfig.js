import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// This exact configuration was provided by the user.
const firebaseConfig = {
    apiKey: "AIzaSyCjVYc2W-FqSObTtEdmELoOEb2B0nYRfrE",
    authDomain: "sberbank-platform.firebaseapp.com",
    projectId: "sberbank-platform",
    storageBucket: "sberbank-platform.firebasestorage.app",
    messagingSenderId: "913766013916",
    appId: "1:913766013916:web:7591520f4d2899317d0d19",
    measurementId: "G-59SG5LP31T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
