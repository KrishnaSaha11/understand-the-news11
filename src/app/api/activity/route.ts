import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

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

export async function POST(req: NextRequest) {
    const uid = await verifyToken(req);
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { type, metadata } = await req.json(); // type: 'read' | 'quiz'

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // 1. Log the activity event
        await adminDb.collection('user_activity').add({
            userId: uid,
            type,
            metadata,
            timestamp: FieldValue.serverTimestamp(),
            date: todayStr
        });

        // 2. Update user profile stats and streak
        const profileRef = adminDb.collection('user_profiles').doc(uid);
        const profileSnap = await profileRef.get();
        const profileData = profileSnap.exists ? profileSnap.data() : {};

        let streak = profileData?.streak || 0;
        let lastActiveDate = profileData?.lastActiveDate || null;
        let totalRead = profileData?.totalRead || 0;
        let totalQuizScore = profileData?.totalQuizScore || 0;
        let totalQuizQuestions = profileData?.totalQuizQuestions || 0;
        let quizzesCompleted = profileData?.quizzesCompleted || 0;
        let knowledgePoints = profileData?.knowledgePoints || 0;
        let completedArticles = profileData?.completedArticles || [];

        // Streak logic
        if (!lastActiveDate) {
            streak = 1;
        } else {
            const lastDate = new Date(lastActiveDate);
            const diffTime = now.getTime() - lastDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                streak += 1;
            } else if (diffDays > 1) {
                streak = 1;
            }
        }

        let pointsEarned = 0;

        // Stats updates
        if (type === 'read') {
            totalRead += 1;
        } else if (type === 'quiz') {
            quizzesCompleted += 1;
            const score = metadata?.score || 0;
            totalQuizScore += score;
            totalQuizQuestions += (metadata?.totalQuestions || 1);

            // Points logic: Only once per article
            const articleUrl = metadata?.url;
            if (articleUrl && !completedArticles.includes(articleUrl)) {
                pointsEarned = score > 0 ? 10 : 5;
                knowledgePoints += pointsEarned;
                completedArticles.push(articleUrl);
            }
        }

        await profileRef.set({
            streak,
            lastActiveDate: todayStr,
            totalRead,
            totalQuizScore,
            totalQuizQuestions,
            quizzesCompleted,
            knowledgePoints,
            completedArticles,
            updated_at: FieldValue.serverTimestamp()
        }, { merge: true });

        return NextResponse.json({
            success: true,
            streak,
            totalRead,
            quizzesCompleted,
            knowledgePoints,
            pointsEarned
        });
    } catch (err: any) {
        console.error('POST /api/activity error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
