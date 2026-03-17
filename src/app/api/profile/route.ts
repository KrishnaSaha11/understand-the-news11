import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

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

export async function GET(req: Request) {
    console.log('GET /api/profile hit');
    const uid = await verifyToken(new NextRequest(req.url, req));
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [profileSnap, prefsSnap] = await Promise.all([
            adminDb.collection('user_profiles').doc(uid).get(),
            adminDb.collection('user_preferences').doc(uid).get()
        ]);

        const profileData = profileSnap.exists ? profileSnap.data() : {};

        return NextResponse.json({
            profile: {
                streak: profileData?.streak || 0,
                totalRead: profileData?.totalRead || 0,
                quizzesCompleted: profileData?.quizzesCompleted || 0,
                totalQuizScore: profileData?.totalQuizScore || 0,
                totalQuizQuestions: profileData?.totalQuizQuestions || 0,
                knowledgePoints: profileData?.knowledgePoints || 0,
                articlesCompleted: profileData?.completedArticles || [],
                ...profileData
            },
            preferences: prefsSnap.exists ? prefsSnap.data() : {}
        });
    } catch (err: any) {
        console.error('GET /api/profile error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const uid = await verifyToken(req);
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { type, data } = body;

        if (type === 'profile') {
            await adminDb.collection('user_profiles').doc(uid).set({
                ...data,
                updated_at: new Date().toISOString()
            }, { merge: true });
        } else if (type === 'preferences') {
            await adminDb.collection('user_preferences').doc(uid).set({
                ...data,
                updated_at: new Date().toISOString()
            }, { merge: true });
        } else {
            return NextResponse.json({ error: 'Invalid update type' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('POST /api/profile error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
