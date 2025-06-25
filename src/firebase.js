import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyA3dBwrdZWGCgMz61NGhgV5DdTkaXNE-mY",
  authDomain: "coral-gala.firebaseapp.com",
  projectId: "coral-gala",
  storageBucket: "coral-gala.firebasestorage.app",
  messagingSenderId: "588155127899",
  appId: "1:588155127899:web:f97cf77b64c80db548977e",
  measurementId: "G-PK1WJ4P8QR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth }; 