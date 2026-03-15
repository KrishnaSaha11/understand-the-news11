import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Verify the Firebase ID token from the Authorization header
async function verifyToken(req: NextRequest): Promise<string | null> {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.split('Bearer ')[1];
    try {
        const decoded = await adminAuth.verifyIdToken(token);
        return decoded.uid;
    } catch {
        return null;
    }
}

// GET /api/bookmarks — fetch all bookmarks for the user
export async function GET(req: NextRequest) {
    const uid = await verifyToken(req);
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const snapshot = await adminDb
            .collection('bookmarks')
            .where('userId', '==', uid)
            .get();

        const bookmarks = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
                savedAt: doc.data().savedAt?.toDate?.()?.toISOString() ?? null,
            }))
            .sort((a: any, b: any) => {
                // Sort newest first in memory (avoids needing a composite index)
                const timeA = a.savedAt ? new Date(a.savedAt).getTime() : 0;
                const timeB = b.savedAt ? new Date(b.savedAt).getTime() : 0;
                return timeB - timeA;
            });

        return NextResponse.json(bookmarks);
    } catch (err: any) {
        console.error('GET /api/bookmarks error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/bookmarks — save a bookmark
export async function POST(req: NextRequest) {
    const uid = await verifyToken(req);
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { article_url, article_data, userEmail } = body;

        if (!article_url) {
            return NextResponse.json({ error: 'article_url is required' }, { status: 400 });
        }

        // Check if already bookmarked
        const existing = await adminDb
            .collection('bookmarks')
            .where('userId', '==', uid)
            .where('article_url', '==', article_url)
            .get();

        if (!existing.empty) {
            return NextResponse.json({ id: existing.docs[0].id, alreadySaved: true });
        }

        const docRef = await adminDb.collection('bookmarks').add({
            userId: uid,
            userEmail,
            article_url,
            article_data,
            savedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ id: docRef.id });
    } catch (err: any) {
        console.error('POST /api/bookmarks error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE /api/bookmarks?url=...  — remove a bookmark
export async function DELETE(req: NextRequest) {
    const uid = await verifyToken(req);
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = req.nextUrl.searchParams.get('url');
    if (!url) {
        return NextResponse.json({ error: 'url query param is required' }, { status: 400 });
    }

    try {
        const snapshot = await adminDb
            .collection('bookmarks')
            .where('userId', '==', uid)
            .where('article_url', '==', url)
            .get();

        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        return NextResponse.json({ deleted: snapshot.size });
    } catch (err: any) {
        console.error('DELETE /api/bookmarks error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
