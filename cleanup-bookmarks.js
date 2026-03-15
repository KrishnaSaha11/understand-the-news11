const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, deleteDoc, doc } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanup() {
    console.log('Starting cleanup...');
    const bookmarksRef = collection(db, 'bookmarks');

    // We want to find docs that DON'T have 'userId' 
    // Firestore doesn't provide a "field doesn't exist" query easily in client SDK,
    // so we'll fetch all and filter locally for this one-time task.
    // Or we can query for the old field 'user_id'.

    const snapshot = await getDocs(bookmarksRef);
    let deletedCount = 0;

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (!data.userId || data.user_id) {
            console.log(`Deleting invalid bookmark: ${docSnap.id}`);
            await deleteDoc(doc(db, 'bookmarks', docSnap.id));
            deletedCount++;
        }
    }

    console.log(`Cleanup finished. Deleted ${deletedCount} documents.`);
    process.exit(0);
}

cleanup().catch(err => {
    console.error(err);
    process.exit(1);
});
