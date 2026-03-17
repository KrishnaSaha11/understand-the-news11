import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (privateKey) {
        // Fix common PEM formatting issues from environment variables
        privateKey = privateKey.trim();
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.substring(1, privateKey.length - 1);
        }
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    if (clientEmail && privateKey) {
        // Service account credentials provided via env vars (preferred for production)
        return initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
            projectId,
        });
    }

    // Fallback: try Application Default Credentials
    // (set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path)
    try {
        return initializeApp({
            credential: applicationDefault(),
            projectId,
        });
    } catch {
        // Last resort: no credentials — token verification will fail but Firestore
        // access might still work in some environments
        console.warn(
            '[firebase-admin] No service account credentials found. ' +
            'Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env.local'
        );
        return initializeApp({ projectId });
    }
}

export const adminDb = getFirestore(getAdminApp());
export const adminAuth = getAuth(getAdminApp());

