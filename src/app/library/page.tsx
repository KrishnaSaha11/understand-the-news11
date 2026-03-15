'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { auth } from '@/lib/firebase';
import NewsCard from '@/components/NewsCard';
import { Loader2, BookMarked, ArrowLeft, X, Brain, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { QuizQuestion, TeacherLevel, QuizDifficulty } from '@/services/ai';
import SpeechPlayer from '@/components/SpeechPlayer';

export default function LibraryPage() {
    const { user, loading: authLoading, stats, updateStats } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [savedArticles, setSavedArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [tempAnalysis, setTempAnalysis] = useState<any | null>(null);

    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [quizScore, setQuizScore] = useState(0);

    const handleAnswer = async (optionIndex: number) => {
        const currentAnalysis = tempAnalysis || selectedArticle?.article_data?.analysis;
        if (selectedOption !== null || !currentAnalysis) return;

        setSelectedOption(optionIndex);
        const correct = optionIndex === currentAnalysis.quick_quiz.correctIndex;
        setIsCorrect(correct);

        if (correct) setQuizScore(prev => prev + 1);

        // Log quiz activity immediately
        if (user) {
            try {
                const token = await auth.currentUser?.getIdToken();
                if (token) {
                    await fetch('/api/activity', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            type: 'quiz',
                            metadata: {
                                score: correct ? 1 : 0,
                                totalQuestions: 1,
                                level: selectedArticle.article_data?.level || 'teenager'
                            }
                        })
                    });
                    updateStats();
                }
            } catch (err) {
                console.error('Failed to log quiz activity:', err);
            }
        }
    };

    const handleLanguageChange = async (newLang: string) => {
        setSelectedLanguage(newLang);
        if (!selectedArticle) return;

        setAnalysisLoading(true);
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: selectedArticle.article_data.url,
                    title: selectedArticle.article_data.title,
                    content: selectedArticle.article_data.description || selectedArticle.article_data.content,
                    level: selectedArticle.article_data?.level || 'teenager',
                    language: newLang
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setTempAnalysis(data);

            // Log read activity
            if (user) {
                try {
                    const token = await auth.currentUser?.getIdToken();
                    if (token) {
                        await fetch('/api/activity', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                type: 'read',
                                metadata: {
                                    title: selectedArticle.article_data.title,
                                    url: selectedArticle.article_data.url,
                                    level: selectedArticle.article_data.level,
                                    language: newLang
                                }
                            })
                        });
                        updateStats();
                    }
                } catch (err) {
                    console.error('Failed to log read activity:', err);
                }
            }
        } catch (err: any) {
            console.error('Failed to fetch translation:', err);
        } finally {
            setAnalysisLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchSaved = async () => {
            if (!user) {
                setSavedArticles([]);
                setLoading(false);
                return;
            }

            if (savedArticles.length === 0) {
                setLoading(true);
            }

            try {
                const token = await auth.currentUser?.getIdToken();
                if (!token) throw new Error('Not authenticated');

                const res = await fetch('/api/bookmarks', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();

                console.log(`Fetched ${data.length} bookmarks for user: ${user.uid}`);
                setSavedArticles(Array.isArray(data) ? data : []);
            } catch (err: any) {
                console.error('Fetch error:', err);
            } finally {
                setLoading(false);
            }
        }

        if (mounted && !authLoading) {
            fetchSaved();
        }
    }, [user, mounted, authLoading]);

    const shouldShowLoader = !mounted || authLoading || (user && loading && savedArticles.length === 0);

    if (shouldShowLoader) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
                <div className="rounded-full bg-secondary p-6 mb-6">
                    <BookMarked className="h-12 w-12 text-foreground/40" />
                </div>
                <h1 className="text-3xl font-black mb-2">My News Library</h1>
                <p className="text-foreground/60 font-bold mb-8">Please sign in to view your saved stories.</p>
                <Link
                    href="/login"
                    className="rounded-full bg-foreground px-8 py-3 font-black text-background hover:scale-105 transition-all shadow-xl"
                >
                    Sign In Now
                </Link>
            </div>
        );
    }

    const currentAnalysis = tempAnalysis || selectedArticle?.article_data?.analysis;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight">My Library</h1>
                    <p className="text-foreground/60 font-bold">You have {savedArticles.length} saved stories</p>
                </div>
                <Link href="/" className="flex items-center space-x-2 text-sm font-black text-blue-600 hover:underline">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to News</span>
                </Link>
            </div>

            {savedArticles.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed p-20 text-center">
                    <p className="text-xl font-black text-foreground/30 uppercase tracking-widest">Your library is empty</p>
                    <p className="text-foreground/50 font-bold mt-2">Start analyzing news to save your favorite lessons!</p>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {savedArticles.map((item) => (
                        <NewsCard
                            key={item.id}
                            article={item.article_data}
                            onAnalyze={() => {
                                setSelectedArticle(item);
                                setTempAnalysis(null);
                                setSelectedLanguage('English');
                                setSelectedOption(null);
                                setIsCorrect(null);
                            }}
                        />
                    ))}
                </div>
            )}

            {selectedArticle && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto modal-overlay p-4 transition-all animate-in fade-in">
                    <div className="relative w-full max-w-5xl rounded-3xl modal-card shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-4 sm:px-8">
                            <button
                                onClick={() => setSelectedArticle(null)}
                                className="flex items-center space-x-2 rounded-xl px-3 py-2 text-foreground transition-all hover:bg-secondary"
                            >
                                <ArrowLeft className="h-5 w-5" />
                                <span className="font-bold">Back to Library</span>
                            </button>
                            <button
                                onClick={() => setSelectedArticle(null)}
                                className="rounded-full bg-secondary p-2 transition-colors hover:bg-secondary/80 text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 sm:p-10">
                            {analysisLoading ? (
                                <div className="flex flex-col items-center justify-center space-y-6 py-32">
                                    <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
                                    <p className="animate-pulse text-2xl font-black">Preparing your lesson... Crafting it with care.</p>
                                </div>
                            ) : (
                                <div className="space-y-8 pb-10">
                                    <div className="space-y-4">
                                        <h2 className="text-3xl font-black sm:text-5xl leading-tight">{selectedArticle.article_data.title}</h2>
                                        <p className="text-sm font-bold text-foreground/60">{selectedArticle.article_data.source.name} • {new Date(selectedArticle.article_data.publishedAt).toLocaleDateString()}</p>
                                        {currentAnalysis && (
                                            <div className="mt-4">
                                                <SpeechPlayer
                                                    text={`${currentAnalysis.hook}. ${currentAnalysis.what_happened}. ${currentAnalysis.why_it_happened}. ${currentAnalysis.why_it_matters}. ${currentAnalysis.simple_explanation}.`}
                                                    currentLanguage={selectedLanguage}
                                                    onLanguageChange={handleLanguageChange}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {currentAnalysis && (
                                        <div className="space-y-12">
                                            <div className="grid gap-8">
                                                {/* Hook */}
                                                <section className="reading-section animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
                                                    <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-8 shadow-sm">
                                                        <div className="flex items-center space-x-3 mb-4">
                                                            <span className="text-2xl">🎬</span>
                                                            <h3 className="text-lg font-black text-purple-800 uppercase tracking-tight">1. The Hook</h3>
                                                        </div>
                                                        <div className="text-xl font-bold text-purple-950 opacity-90 leading-relaxed">
                                                            <p>{currentAnalysis.hook}</p>
                                                        </div>
                                                    </div>
                                                </section>

                                                {/* What Happened */}
                                                <section className="reading-section animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                                                    <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-8 shadow-sm">
                                                        <div className="flex items-center space-x-3 mb-4">
                                                            <span className="text-2xl">🧠</span>
                                                            <h3 className="text-lg font-black text-orange-800 uppercase tracking-tight">2. What Happened</h3>
                                                        </div>
                                                        <div className="text-xl font-bold text-orange-950 opacity-90 leading-relaxed">
                                                            <p>{currentAnalysis.what_happened}</p>
                                                        </div>
                                                    </div>
                                                </section>

                                                {/* Why It Happened */}
                                                <section className="reading-section animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                                    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-8 shadow-sm">
                                                        <div className="flex items-center space-x-3 mb-4">
                                                            <span className="text-2xl">⚡</span>
                                                            <h3 className="text-lg font-black text-blue-800 uppercase tracking-tight">3. Why It Happened</h3>
                                                        </div>
                                                        <div className="text-xl font-bold text-blue-950 opacity-90 leading-relaxed">
                                                            <p>{currentAnalysis.why_it_happened}</p>
                                                        </div>
                                                    </div>
                                                </section>

                                                {/* Why It Matters */}
                                                <section className="reading-section animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                                                    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 shadow-sm">
                                                        <div className="flex items-center space-x-3 mb-4">
                                                            <span className="text-2xl">🌍</span>
                                                            <h3 className="text-lg font-black text-emerald-800 uppercase tracking-tight">4. Why It Matters</h3>
                                                        </div>
                                                        <div className="text-xl font-bold text-emerald-950 opacity-90 leading-relaxed">
                                                            <p>{currentAnalysis.why_it_matters}</p>
                                                        </div>
                                                    </div>
                                                </section>

                                                {/* Simple Explanation */}
                                                <section className="reading-section animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
                                                    <div className="rounded-2xl border-2 border-pink-200 bg-pink-50 p-8 shadow-sm">
                                                        <div className="flex items-center space-x-3 mb-4">
                                                            <span className="text-2xl">🧒</span>
                                                            <h3 className="text-lg font-black text-pink-800 uppercase tracking-tight">5. Simple Explanation</h3>
                                                        </div>
                                                        <div className="text-xl font-bold text-pink-950 opacity-90 leading-relaxed">
                                                            <p>{currentAnalysis.simple_explanation}</p>
                                                        </div>
                                                    </div>
                                                </section>

                                                {/* Integrated Quiz */}
                                                <section className="reading-section animate-fade-in-up pt-8 border-t" style={{ animationDelay: '0.4s' }}>
                                                    <div className="rounded-3xl border-4 border-blue-600 bg-card p-8 shadow-xl">
                                                        <div className="flex items-center space-x-3 mb-6">
                                                            <span className="text-2xl">🧠</span>
                                                            <h3 className="text-xl font-black text-blue-600 uppercase tracking-tight">Quick Quiz</h3>
                                                        </div>

                                                        <div className="space-y-6">
                                                            <h4 className="text-2xl font-black leading-tight">
                                                                {currentAnalysis.quick_quiz.question}
                                                            </h4>

                                                            <div className="grid gap-3">
                                                                {currentAnalysis.quick_quiz.options.map((option: string, idx: number) => {
                                                                    const isSelected = selectedOption === idx;
                                                                    const isCorrectOption = idx === currentAnalysis.quick_quiz.correctIndex;

                                                                    let appearance = "border-secondary bg-background hover:border-blue-200";
                                                                    if (selectedOption !== null) {
                                                                        if (isCorrectOption) appearance = "border-emerald-500 bg-emerald-50 text-emerald-900";
                                                                        else if (isSelected) appearance = "border-red-500 bg-red-50 text-red-900";
                                                                        else appearance = "opacity-50 border-secondary bg-background";
                                                                    }

                                                                    return (
                                                                        <button
                                                                            key={idx}
                                                                            disabled={selectedOption !== null}
                                                                            onClick={() => handleAnswer(idx)}
                                                                            className={`flex items-center justify-between rounded-2xl border-4 p-5 text-left font-bold transition-all ${appearance}`}
                                                                        >
                                                                            <span>{option}</span>
                                                                            {selectedOption !== null && isCorrectOption && <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />}
                                                                            {selectedOption === idx && !isCorrectOption && <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            {selectedOption !== null && (
                                                                <div className="animate-fade-in rounded-2xl bg-secondary/50 p-6">
                                                                    <p className="text-lg">
                                                                        <span className="font-black uppercase tracking-tight mr-2 block mb-1">
                                                                            {isCorrect ? "✅ Awesome!" : "❌ Not Quite!"}
                                                                        </span>
                                                                        <span className="font-bold opacity-80">{currentAnalysis.quick_quiz.explanation}</span>
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </section>
                                            </div>

                                            <div className="mt-12 flex flex-col items-center gap-4 border-t border-foreground/10 pt-10 pb-5">
                                                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                                                    <a
                                                        href={selectedArticle.article_data.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="group flex items-center justify-center space-x-3 rounded-2xl bg-foreground px-8 py-5 font-black text-background transition-all hover:scale-105 shadow-2xl"
                                                    >
                                                        <span>Read Full Original Article</span>
                                                        <ArrowLeft className="h-5 w-5 rotate-180 transition-transform group-hover:translate-x-1" />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
