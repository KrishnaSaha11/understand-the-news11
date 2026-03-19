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
            className="group relative flex flex-col space-y-3 overflow-hidden rounded-[16px] border border-border bg-card p-4 sm:p-5 transition-all hover:border-primary hover:shadow-[0_0_0_1px_var(--color-primary)]"
        >
            {article.urlToImage && (
                <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                    <img
                        src={article.urlToImage}
                        alt={article.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                </div>
            )}
            <div className="flex flex-1 flex-col justify-between relative z-10">
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <span>{article.source.name}</span>
                        <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="line-clamp-2 text-lg sm:text-xl font-bold leading-tight text-foreground transition-colors">
                        {article.title}
                    </h3>
                    <p className="line-clamp-3 text-xs sm:text-sm font-medium text-muted-foreground leading-relaxed">
                        {article.description}
                    </p>
                </div>
                <div className="mt-4 sm:mt-6">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onAnalyze(article);
                        }}
                        className="w-full rounded-full bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-[#000000] transition-all hover:bg-[#D97706] active:scale-95 shadow-lg"
                    >
                        🧠 Understand in 30 Seconds
                    </button>
                </div>
            </div>
        </div>
    );
}
