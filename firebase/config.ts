



import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// Fix: Centralize storage imports to resolve potential module resolution issues.
// FIX: Use a namespace import for firebase/storage to avoid module resolution errors.
import * as storageFunctions from 'firebase/storage';

// Updated with your Firebase project configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCHho2lTCw5DUNPdaieHF-OJWGXNocom58",
  authDomain: "jazzlink.kr",
  projectId: "jazzlink-eb611",
  storageBucket: "jazzlink-eb611.firebasestorage.app",
  messagingSenderId: "597781140601",
  appId: "1:597781140601:web:b8e007f71d0078391b30a8",
  measurementId: "G-KYKWMKGVJH"
};

// Check if the config is still using placeholder values.
// This will now be false, so the app will connect to Firebase.
export const USE_MOCK_DATA = firebaseConfig.apiKey === "YOUR_API_KEY";

if (USE_MOCK_DATA) {
    console.warn(`
    *****************************************************************
    * Firebase configuration is missing in 'firebase/config.ts'.    *
    * The application is running in OFFLINE MODE with mock data.    *
    * To connect to Firebase, please update the configuration file. *
    *****************************************************************
    `);
}

// Initialize Firebase only if the config is not a placeholder.
const app = USE_MOCK_DATA ? null : initializeApp(firebaseConfig);

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
// FIX: Initialize storage using the function from the namespace import.
export const storage = app ? storageFunctions.getStorage(app) : null;

// Fix: Export storage functions from here to be used across the app.
// FIX: Destructure and export functions from the namespace import.
const { ref, uploadBytes, getDownloadURL } = storageFunctions;
export { ref, uploadBytes, getDownloadURL };
