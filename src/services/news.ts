export interface NewsArticle {
    title: string;
    description: string;
    url: string;
    urlToImage: string;
    publishedAt: string;
    source: {
        name: string;
    };
    content?: string;
}

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const BASE_URL = 'https://newsapi.org/v2';

export async function getTopHeadlines(category: string = 'general'): Promise<NewsArticle[]> {
    const response = await fetch(`${BASE_URL}/top-headlines?country=us&category=${category}&apiKey=${NEWSAPI_KEY}`);
    const data = await response.json();

    if (data.status !== 'ok') {
        throw new Error(data.message || 'Failed to fetch news');
    }

    return data.articles;
}

export async function searchNews(query: string): Promise<NewsArticle[]> {
    const response = await fetch(`${BASE_URL}/everything?q=${encodeURIComponent(query)}&apiKey=${NEWSAPI_KEY}`);
    const data = await response.json();

    if (data.status !== 'ok') {
        throw new Error(data.message || 'Failed to search news');
    }

    return data.articles;
}
