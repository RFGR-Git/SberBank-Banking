    // src/firebaseConfig.js
    import { initializeApp } from "firebase/app";
    import { getAuth } from "firebase/auth";
    import { getFirestore } from "firebase/firestore";
    // If you want to use analytics, keep this import. Otherwise, you can remove it.
    // import { getAnalytics } from "firebase/analytics"; 

    // REPLACE THIS ENTIRE firebaseConfig OBJECT WITH THE ONE FROM YOUR BRAND NEW FIREBASE PROJECT
    const firebaseConfig = {
      apiKey: "YOUR_NEW_API_KEY_HERE",
      authDomain: "YOUR_NEW_AUTH_DOMAIN_HERE",
      projectId: "YOUR_NEW_PROJECT_ID_HERE",
      storageBucket: "YOUR_NEW_STORAGE_BUCKET_HERE",
      messagingSenderId: "YOUR_NEW_MESSAGING_SENDER_ID_HERE",
      appId: "YOUR_NEW_APP_ID_HERE" // THIS IS YOUR NEW APP ID
      // measurementId: "YOUR_NEW_MEASUREMENT_ID_HERE" // Include if provided
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    export { auth, db };
    