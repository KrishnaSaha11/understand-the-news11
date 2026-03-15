import { NewsArticle } from '@/services/news';
import { useRef } from 'react';

interface NewsCardProps {
    article: NewsArticle;
    onAnalyze: (article: NewsArticle) => void;
}

export default function NewsCard({ article, onAnalyze }: NewsCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        cardRef.current.style.setProperty('--mouse-x', `${x}px`);
        cardRef.current.style.setProperty('--mouse-y', `${y}px`);
    };

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            className="group spotlight-card relative flex flex-col space-y-3 overflow-hidden rounded-3xl border-2 bg-card p-4 transition-all hover:shadow-2xl hover:-translate-y-1"
        >
            {article.urlToImage && (
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl">
                    <img
                        src={article.urlToImage}
                        alt={article.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
            )}
            <div className="flex flex-1 flex-col justify-between relative z-10">
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                        <span>{article.source.name}</span>
                        <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="line-clamp-2 text-xl font-black leading-tight group-hover:text-blue-600 transition-colors">
                        {article.title}
                    </h3>
                    <p className="line-clamp-3 text-sm font-bold text-muted-foreground/80 leading-relaxed">
                        {article.description}
                    </p>
                </div>
                <div className="mt-6">
                    <button
                        onClick={() => onAnalyze(article)}
                        className="shimmer-btn w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-200"
                    >
                        🧠 Understand in 30 Seconds
                    </button>
                </div>
            </div>
        </div>
    );
}
