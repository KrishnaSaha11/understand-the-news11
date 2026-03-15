import { NextResponse } from 'next/server';
import { analyzeWithGroq, TeacherLevel } from '@/services/ai';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const { title, content, url, level = 'teenager', language = 'English' } = await request.json();

        if (!url || !title) {
            return NextResponse.json({ error: 'URL and Title are required' }, { status: 400 });
        }

        const result = await getOrGenerateAnalysis(url, title, content, level, language);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Groq Analysis API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * Helper to get analysis from cache or generate a new one
 */
export async function getOrGenerateAnalysis(
    url: string,
    title: string,
    content: string | null,
    level: TeacherLevel = 'teenager',
    language: string = 'English'
) {
    const cacheCollection = 'explanations_cache_v4';

    // 1. Check cache first
    try {
        const snapshot = await adminDb
            .collection(cacheCollection)
            .where('url', '==', url)
            .where('level', '==', level)
            .where('language', '==', language)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const cachedData = snapshot.docs[0].data();
            return cachedData.result;
        }
    } catch (cacheError) {
        console.warn('Cache read bypassed (Connection issue):', cacheError);
    }

    // 2. Generate new analysis
    const result = await analyzeWithGroq(title, content, level, language);

    // 3. Save to cache in background
    adminDb.collection(cacheCollection).add({
        url,
        title,
        result,
        level,
        language,
        createdAt: new Date().toISOString()
    }).catch(saveError => {
        console.warn('Cache write failed:', saveError);
    });

    return result;
}
