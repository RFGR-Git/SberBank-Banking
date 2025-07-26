// src/firebaseConfig.js
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// Import getAuth and getFirestore for authentication and database access
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// If you want to use analytics, keep this import. Otherwise, you can remove it.
// import { getAnalytics } from "firebase/analytics"; 

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAEHQpXLEFFb3HtjfcUVXyQpVePMwqyUg4",
  authDomain: "sberbank-web-app-e6c6a.firebaseapp.com",
  projectId: "sberbank-web-app-e6c6a",
  storageBucket: "sberbank-web-app-e6c6a.firebasestorage.app",
  messagingSenderId: "532537697624",
  appId: "1:532537697624:web:0975fb2eac35f10652712d", // THIS IS YOUR NEW APP ID
  measurementId: "G-RXZ1VTLE9R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services that your app uses
const auth = getAuth(app);
const db = getFirestore(app);
// If you're using analytics, uncomment the line below
// const analytics = getAnalytics(app);

// Export auth and db so other components can use them
export { auth, db };
// If you're using analytics, export it too
// export { auth, db, analytics };
