import { NextResponse } from 'next/server';
import { getTopHeadlines, searchNews } from '@/services/news';
import { getOrGenerateAnalysis } from '../analyze/route';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'general';
    const query = searchParams.get('q');

    try {
        let articles: any[];
        if (query) {
            articles = await searchNews(query);
        } else {
            articles = await getTopHeadlines(category);
        }

        // Sort by date: Newest first
        articles.sort((a: any, b: any) => {
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        });

        // Proactive AI Generation: Pre-analyze top 5 articles in background
        if (articles.length > 0) {
            const top5 = articles.slice(0, 5);
            // Trigger in background - don't await the final result
            Promise.allSettled(
                top5.map(article =>
                    getOrGenerateAnalysis(
                        article.url,
                        article.title,
                        article.description || article.content || null
                    ).catch(e => console.error(`Proactive analysis failed for ${article.url}:`, e))
                )
            );
        }

        return NextResponse.json(articles);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
