

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// API Key is now securely accessed from environment variables.
export const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: "jazzlink.kr",
  projectId: "jazzlink-eb611",
  storageBucket: "jazzlink-eb611.firebasestorage.app",
  messagingSenderId: "597781140601",
  appId: "1:597781140601:web:b8e007f71d0078391b30a8",
  measurementId: "G-KYKWMKGVJH"
};

// Check if the API key is provided via environment variables.
// If not, the app will run in offline mode with mock data.
export const USE_MOCK_DATA = !firebaseConfig.apiKey;

if (USE_MOCK_DATA) {
    console.warn(`
    *****************************************************************
    * Firebase API_KEY is not configured.                           *
    * The application is running in OFFLINE MODE with mock data.    *
    * To connect to Firebase, please set the API_KEY env variable.  *
    *****************************************************************
    `);
}

// Initialize Firebase only if the API key is available.
const app = USE_MOCK_DATA ? null : initializeApp(firebaseConfig);

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;