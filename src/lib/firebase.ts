import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const app = getApps().length === 0
    ? initializeApp({
        apiKey: "AIzaSyBjNT1rJwzljXxOv9Q3dpBGWFuY47bE6U0",
        authDomain: "understandnewsapp.firebaseapp.com",
        projectId: "understandnewsapp",
        storageBucket: "understandnewsapp.firebasestorage.app",
        messagingSenderId: "313730479296",
        appId: "1:313730479296:web:7674ccd10e017610fb2925"
    })
    : getApp()

export const db = getFirestore(app)
export const auth = getAuth(app)
export default app
