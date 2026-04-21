// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// We removed all the 'auth' imports

import Constants from 'expo-constants';

// Get the keys from the .env.local file
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.VITE_API_KEY,
  authDomain: Constants.expoConfig?.extra?.VITE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?.extra?.VITE_PROJECT_ID,
  storageBucket: Constants.expoConfig?.extra?.VITE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?.extra?.VITE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig?.extra?.VITE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export only the database (which the app needs)
export const db = getFirestore(app);