// ============================================================
// Firebase Configuration
// ============================================================
// REPLACE these placeholder values with your actual Firebase
// project config from:
// Firebase Console → Project Settings → Your Apps → Web App
// ============================================================

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey:            "AIzaSyAySdwPgP2kLWhHEDpp7qzKRerLYT0BlQI",
  authDomain:        "studio-2877955361-de17f.firebaseapp.com",
  projectId:         "studio-2877955361-de17f",
  storageBucket:     "studio-2877955361-de17f.firebasestorage.app",
  messagingSenderId: "530627314675",
  appId:             "1:530627314675:web:3f26ea29b194bb6bd00886",
  // Add your Realtime Database URL here once you enable it in Firebase Console:
  // databaseURL: "https://studio-2877955361-de17f-default-rtdb.firebaseio.com",
};

// Check if config looks real (basic heuristic)
export const isFirebaseConfigured =
  !firebaseConfig.apiKey.startsWith('REPLACE') &&
  firebaseConfig.apiKey.length > 10;

const app = initializeApp(firebaseConfig);

export const auth     = getAuth(app);
export const db       = getFirestore(app);
export const provider = new GoogleAuthProvider();

// Only init Realtime DB when a databaseURL is provided
export const rtdb = firebaseConfig.databaseURL
  ? getDatabase(app)
  : null;

provider.setCustomParameters({ prompt: 'select_account' });
