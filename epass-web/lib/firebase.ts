import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // You need to add these values from your Firebase Console
  // Go to Project Settings > General > Your apps > Web app > Config
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'epass-b6fd8',
  // Optional - only needed if you use these services
  // storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  // messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  // appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

// For development - set this to 'development' to use test phone numbers
export const isDev = process.env.NODE_ENV === 'development';

// Test phone numbers for development (optional - configure in Firebase Console)
// You can add test phone numbers in Firebase Console > Authentication > Sign-in method > Phone > Test phone numbers
