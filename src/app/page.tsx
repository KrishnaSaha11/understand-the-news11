'use client';

import { useEffect, useState, Suspense } from 'react';
import { NewsArticle } from '@/services/news';
import NewsCard from '@/components/NewsCard';
import { ArrowLeft, Loader2, X, Bookmark, BookmarkCheck, Brain, CheckCircle2, AlertCircle, Trophy, Target, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/components/AuthProvider';
import { auth } from '@/lib/firebase';
import { useSearchParams } from 'next/navigation';
import { QuizQuestion, QuizDifficulty } from '@/services/ai';
import SpeechPlayer from '@/components/SpeechPlayer';

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { user, level, setLevel, stats, updateStats } = useAuth();
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || 'general';
  const query = searchParams.get('q') || '';

  useEffect(() => {
    setMounted(true);
  }, []);

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    hook: string;
    what_happened: string;
    why_it_happened: string;
    why_it_matters: string;
    simple_explanation: string;
    quick_quiz: {
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    };
  } | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [quizScore, setQuizScore] = useState(0);

  const handleAnswer = async (optionIndex: number) => {
    if (selectedOption !== null || !analysisResult) return;

    setSelectedOption(optionIndex);
    const correct = optionIndex === analysisResult.quick_quiz.correctIndex;
    setIsCorrect(correct);

    if (correct) setQuizScore(prev => prev + 1);

    // Log quiz activity immediately
    if (user) {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          const res = await fetch('/api/activity', {
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
                level: level,
                url: selectedArticle?.url // Track article URL for points
              }
            })
          });
          const data = await res.json();
          if (data.pointsEarned > 0) {
            showToast(`+${data.pointsEarned} Knowledge Points earned! 🎉`);
          }
          updateStats();
        }
      } catch (err) {
        console.error('Failed to log quiz activity:', err);
      }
    }
  };

  useEffect(() => {
    async function fetchNews() {
      setLoading(true);
      try {
        const url = query
          ? `/api/news?q=${encodeURIComponent(query)}`
          : `/api/news?category=${category}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) throw new Error(data.error);
        setArticles(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch news');
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, [category, query]); // Refetch when category or query changes

  const trendingTopics = [
    { id: 'ai', label: 'Artificial Intelligence', icon: '🤖' },
    { id: 'climate', label: 'Climate Change', icon: '🌍' },
    { id: 'space', label: 'Space', icon: '🚀' },
    { id: 'gaming', label: 'Gaming', icon: '🎮' },
    { id: 'finance', label: 'Finance', icon: '💰' },
    { id: 'health', label: 'Health', icon: '🏥' },
  ];

  const handleAnalyze = async (article: NewsArticle, language: string = selectedLanguage) => {
    setSelectedArticle(article);
    setAnalysisResult(null);
    setAnalysisLoading(true);
    setIsSaved(false);
    setSelectedOption(null);
    setIsCorrect(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: article.description || article.content || null,
          url: article.url,
          level: level, // Pass current selected level
          language: language
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysisResult(data);

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
                  title: article.title,
                  url: article.url,
                  level: level
                }
              })
            });
            updateStats(); // Refresh stats in context
          }
        } catch (err) {
          console.error('Failed to log read activity:', err);
        }
      }

    } catch (err: any) {
      console.error('Analysis failed:', err);
      if (err.message) console.error('Error message:', err.message);
      setAnalysisResult(null);
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    async function checkSavedStatus() {
      if (!user?.uid || !selectedArticle) {
        setIsSaved(false);
        return;
      }
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch('/api/bookmarks', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const found = Array.isArray(data) && data.some((b: any) => b.article_url === selectedArticle.url);
        setIsSaved(found);
      } catch (err) {
        console.error('Check saved status error:', err);
        setIsSaved(false);
      }
    }
    checkSavedStatus();
  }, [user, selectedArticle]);

  const handleLanguageChange = (newLang: string) => {
    setSelectedLanguage(newLang);
    if (selectedArticle) {
      handleAnalyze(selectedArticle, newLang);
    }
  };

  const handleSave = async () => {
    if (!user || !selectedArticle || !analysisResult) return;

    setIsSaving(true);
    const previousSavedState = isSaved;
    setIsSaved(!isSaved); // Optimistic update

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      if (previousSavedState) {
        // Unsave
        const res = await fetch(`/api/bookmarks?url=${encodeURIComponent(selectedArticle.url)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        // Save
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            article_url: selectedArticle.url,
            userEmail: user.email,
            article_data: {
              ...selectedArticle,
              analysis: analysisResult,
              level,
            },
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        console.log('Successfully saved to Firebase via API!');
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      setIsSaved(previousSavedState); // Revert on error
      showToast('Failed to update saved stories. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  const accuracy = stats.totalQuizQuestions > 0
    ? Math.round((stats.totalQuizScore / stats.totalQuizQuestions) * 100)
    : 0;

  return (
    <div className="container mx-auto px-4 py-12 space-y-12">
      {/* Stats Dashboard */}
      {user && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
          <div className="relative overflow-hidden group rounded-3xl bg-blue-600 p-6 text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95">
            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              <div className="flex items-center justify-between">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Brain className="h-6 w-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest opacity-80">Reading Progress</span>
              </div>
              <div>
                <div className="text-4xl font-black">{stats.totalRead}</div>
                <div className="text-sm font-bold opacity-80">Stories Explained</div>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Brain className="h-24 w-24" />
            </div>
          </div>

          <div className="relative overflow-hidden group rounded-3xl bg-orange-500 p-6 text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95">
            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              <div className="flex items-center justify-between">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Zap className="h-6 w-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest opacity-80">Current Streak</span>
              </div>
              <div>
                <div className="text-4xl font-black">{stats.streak} Days</div>
                <div className="text-sm font-bold opacity-80">Active Learning</div>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap className="h-24 w-24" />
            </div>
          </div>

          <div className="relative overflow-hidden group rounded-3xl bg-emerald-500 p-6 text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95">
            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              <div className="flex items-center justify-between">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Target className="h-6 w-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest opacity-80">Quiz Mastery</span>
              </div>
              <div>
                <div className="text-4xl font-black">{accuracy}%</div>
                <div className="text-sm font-bold opacity-80">Average Accuracy</div>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Target className="h-24 w-24" />
            </div>
          </div>

          <div className="relative overflow-hidden group rounded-3xl bg-purple-600 p-6 text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95">
            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              <div className="flex items-center justify-between">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Trophy className="h-6 w-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest opacity-80">Knowledge Points</span>
              </div>
              <div>
                <div className="text-4xl font-black">{stats.knowledgePoints}</div>
                <div className="text-sm font-bold opacity-80">Total Earned</div>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Trophy className="h-24 w-24" />
            </div>
          </div>
        </div>
      )}      {/* Hero Section with Level Selector */}
      <div className="text-center space-y-8 animate-fade-in">
        <div className="space-y-4">
          <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
            Choose Your <span className="text-blue-600 animate-pulse">Teacher</span>
          </h1>
          <p className="mx-auto max-w-2xl text-xl font-bold text-foreground/60">
            Tell us how you want to learn today. We'll adjust the lessons to match your level perfectly.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {[
            { id: 'child', label: '👶 Simple', desc: 'ELI5 Mode' },
            { id: 'teenager', label: '🧑 Relatable', desc: 'Default Mode' },
            { id: 'expert', label: '🎓 In-depth', desc: 'Expert Mode' },
          ].map((lvl) => (
            <button
              key={lvl.id}
              onClick={() => setLevel(lvl.id as any)}
              className={`group flex flex-col items-center space-y-1 rounded-2xl border-4 p-4 transition-all hover:scale-105 active:scale-95 sm:px-8 ${mounted && level === lvl.id
                ? 'border-blue-600 bg-blue-50/50'
                : 'border-secondary bg-card hover:border-blue-200'
                }`}
            >
              <span className={`text-xl font-black transition-colors ${level === lvl.id ? 'text-blue-600' : ''}`}>
                {lvl.label}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-foreground/40">
                {lvl.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Topic Cloud / Discover Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground/40">Discover Trending Niches</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {trendingTopics.map((topic) => (
            <a
              key={topic.id}
              href={`/?q=${encodeURIComponent(topic.label)}`}
              className="flex items-center space-x-2 rounded-2xl bg-secondary/30 px-5 py-2.5 text-sm font-bold transition-all hover:bg-blue-600 hover:text-white hover:scale-105 active:scale-95"
            >
              <span>{topic.icon}</span>
              <span>{topic.label}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="mb-8 flex items-center justify-between border-b pb-4">
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          {query ? (
            <>
              <span className="text-foreground/40 font-bold">Search results for:</span>
              <span className="text-blue-600">{query}</span>
            </>
          ) : (
            <>Today's Top Stories <span className="text-blue-600 capitalize">{category}</span></>
          )}
        </h1>
        <div className="text-sm font-black text-foreground/40 px-3 py-1 bg-secondary/50 rounded-lg">
          {articles.length} {articles.length === 1 ? 'Article' : 'Articles'} found
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {articles.map((article, index) => (
          <NewsCard
            key={index}
            article={article}
            onAnalyze={handleAnalyze}
          />
        ))}
      </div>

      {/* Analysis Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto modal-overlay p-4 transition-all animate-in fade-in">
          <div className="relative w-full max-w-5xl rounded-3xl modal-card shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-4 sm:px-8">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="flex items-center space-x-2 rounded-xl px-3 py-2 text-foreground transition-all hover:bg-secondary"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="font-bold">Back to News</span>
                </button>

                {mounted && user && analysisResult && !analysisLoading && (
                  <button
                    onClick={handleSave}
                    className={`shimmer-btn flex items-center space-x-2 rounded-xl px-4 py-2 text-sm font-black transition-all ${isSaved
                      ? 'bg-blue-600 text-white'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                      }`}
                  >
                    {isSaved ? (
                      <>
                        <BookmarkCheck className="h-4 w-4" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-4 w-4" />
                        <span>Save Story</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="rounded-full bg-secondary p-2 transition-colors hover:bg-secondary/80 text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col lg:flex-row min-h-full">
                {/* Table of Contents - Sidebar on Large Screens, Menu on Small */}
                <div className="lg:sticky lg:top-0 lg:h-[calc(92vh-73px)] lg:w-72 border-b lg:border-b-0 lg:border-r bg-secondary/30 p-6 overflow-y-auto hidden md:block">
                  <div className="mb-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-foreground/40 mb-4">Jump to Section</h4>
                    <nav className="space-y-1">
                      <a href="#hook" className="toc-link">🎬 Hook</a>
                      <a href="#what" className="toc-link">🧠 What Happened</a>
                      <a href="#why-happened" className="toc-link">⚡ Why It Happened</a>
                      <a href="#matters" className="toc-link">🌍 Why It Matters</a>
                      <a href="#simple" className="toc-link">🧒 Simple Explanation</a>
                      <a href="#quiz" className="toc-link">🧠 Quick Quiz</a>
                    </nav>
                  </div>

                  <div className="rounded-2xl bg-blue-600 p-4 text-white shadow-lg mt-auto">
                    <p className="text-xs font-black uppercase mb-1">Teacher's Tip</p>
                    <p className="text-sm font-medium opacity-90">Take your time reading! This is a detailed look at the story.</p>
                  </div>
                </div>

                <div className="flex-1 p-6 sm:p-10 max-w-4xl mx-auto lg:mx-0">
                  <div className="mb-10 space-y-4 animate-fade-in-up">
                    <span className="inline-block rounded-full bg-blue-600/10 px-4 py-1 text-xs font-black uppercase tracking-widest text-blue-600">
                      Friendly Teacher Mode
                    </span>
                    <h2 className="text-3xl font-black text-foreground sm:text-5xl leading-tight">
                      {selectedArticle.title}
                    </h2>
                    <div className="flex items-center space-x-4 text-sm font-bold text-foreground/60">
                      <span>{selectedArticle.source.name}</span>
                      <span className="h-1 w-1 rounded-full bg-foreground/30" />
                      <span>{new Date(selectedArticle.publishedAt).toLocaleDateString()}</span>
                    </div>
                    {analysisResult && (
                      <div className="mt-4">
                        <SpeechPlayer
                          text={`${analysisResult.hook}. ${analysisResult.what_happened}. ${analysisResult.why_it_happened}. ${analysisResult.why_it_matters}. ${analysisResult.simple_explanation}.`}
                          currentLanguage={selectedLanguage}
                          onLanguageChange={handleLanguageChange}
                        />
                      </div>
                    )}
                  </div>

                  {analysisLoading ? (
                    <div className="flex flex-col items-center justify-center space-y-6 py-32">
                      <div className="relative">
                        <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="animate-pulse text-2xl font-black text-foreground">
                          Generating lesson<span className="animate-[ping_1.5s_infinite] inline-block">.</span><span className="animate-[ping_1.5s_infinite_200ms] inline-block">.</span><span className="animate-[ping_1.5s_infinite_400ms] inline-block">.</span>
                        </p>
                        <p className="text-foreground/50 font-medium italic">Our AI is crafting a simple, high-impact explanation just for you.</p>
                      </div>
                    </div>
                  ) : analysisResult ? (
                    <div className="space-y-12 pb-10">
                      <div className="grid gap-8">
                        {/* Hook */}
                        <section id="hook" className="reading-section animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
                          <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-8 shadow-sm">
                            <div className="flex items-center space-x-3 mb-4">
                              <span className="text-2xl">🎬</span>
                              <h3 className="text-lg font-black text-purple-800 uppercase tracking-tight">1. The Hook</h3>
                            </div>
                            <div className="text-xl font-bold text-purple-950 opacity-90 leading-relaxed">
                              <p>{analysisResult.hook}</p>
                            </div>
                          </div>
                        </section>

                        {/* What Happened */}
                        <section id="what" className="reading-section animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                          <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-8 shadow-sm">
                            <div className="flex items-center space-x-3 mb-4">
                              <span className="text-2xl">🧠</span>
                              <h3 className="text-lg font-black text-orange-800 uppercase tracking-tight">2. What Happened</h3>
                            </div>
                            <div className="text-xl font-bold text-orange-950 opacity-90 leading-relaxed">
                              <p>{analysisResult.what_happened}</p>
                            </div>
                          </div>
                        </section>

                        {/* Why It Happened */}
                        <section id="why-happened" className="reading-section animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-8 shadow-sm">
                            <div className="flex items-center space-x-3 mb-4">
                              <span className="text-2xl">⚡</span>
                              <h3 className="text-lg font-black text-blue-800 uppercase tracking-tight">3. Why It Happened</h3>
                            </div>
                            <div className="text-xl font-bold text-blue-950 opacity-90 leading-relaxed">
                              <p>{analysisResult.why_it_happened}</p>
                            </div>
                          </div>
                        </section>

                        {/* Why It Matters */}
                        <section id="matters" className="reading-section animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 shadow-sm">
                            <div className="flex items-center space-x-3 mb-4">
                              <span className="text-2xl">🌍</span>
                              <h3 className="text-lg font-black text-emerald-800 uppercase tracking-tight">4. Why It Matters</h3>
                            </div>
                            <div className="text-xl font-bold text-emerald-950 opacity-90 leading-relaxed">
                              <p>{analysisResult.why_it_matters}</p>
                            </div>
                          </div>
                        </section>

                        {/* Simple Explanation */}
                        <section id="simple" className="reading-section animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
                          <div className="rounded-2xl border-2 border-pink-200 bg-pink-50 p-8 shadow-sm">
                            <div className="flex items-center space-x-3 mb-4">
                              <span className="text-2xl">🧒</span>
                              <h3 className="text-lg font-black text-pink-800 uppercase tracking-tight">5. Simple Explanation</h3>
                            </div>
                            <div className="text-xl font-bold text-pink-950 opacity-90 leading-relaxed">
                              <p>{analysisResult.simple_explanation}</p>
                            </div>
                          </div>
                        </section>

                        {/* Integrated Quiz */}
                        <section id="quiz" className="reading-section animate-fade-in-up pt-8 border-t" style={{ animationDelay: '0.4s' }}>
                          <div className="rounded-3xl border-4 border-blue-600 bg-card p-8 shadow-xl">
                            <div className="flex items-center space-x-3 mb-6">
                              <span className="text-2xl">🧠</span>
                              <h3 className="text-xl font-black text-blue-600 uppercase tracking-tight">Quick Quiz</h3>
                            </div>

                            <div className="space-y-6">
                              <h4 className="text-2xl font-black leading-tight">
                                {analysisResult.quick_quiz.question}
                              </h4>

                              <div className="grid gap-3">
                                {analysisResult.quick_quiz.options.map((option, idx) => {
                                  const isSelected = selectedOption === idx;
                                  const isCorrectOption = idx === analysisResult.quick_quiz.correctIndex;

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
                                <div className="mt-10 pt-10 border-t border-blue-100 animate-fade-in">
                                  <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                                      <Brain className="h-6 w-6 text-blue-600" />
                                      Continue Learning
                                    </h3>
                                    <span className="text-xs font-black text-foreground/40 uppercase tracking-widest">Recommended for you</span>
                                  </div>

                                  <div className="grid gap-4 sm:grid-cols-3">
                                    {articles
                                      .filter(a => a.url !== selectedArticle.url && !stats.articlesCompleted.includes(a.url))
                                      .slice(0, 3)
                                      .map((recArticle, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => handleAnalyze(recArticle)}
                                          className="group flex flex-col items-center space-y-2 rounded-2xl border-2 border-secondary bg-background p-3 text-left transition-all hover:border-blue-200 hover:shadow-lg"
                                        >
                                          {recArticle.urlToImage && (
                                            <div className="aspect-video w-full overflow-hidden rounded-xl">
                                              <img src={recArticle.urlToImage} alt="" className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                            </div>
                                          )}
                                          <h4 className="line-clamp-2 text-xs font-black leading-tight group-hover:text-blue-600 transition-colors">
                                            {recArticle.title}
                                          </h4>
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </section>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center rounded-2xl border-2 border-red-600 bg-red-600/10 p-10 animate-fade-in-up">
                      <p className="text-3xl font-black text-red-600 uppercase mb-4">Error</p>
                      <p className="text-foreground mt-2 text-xl font-bold">Failed to generate explanation. Please try again.</p>
                      <button
                        onClick={() => handleAnalyze(selectedArticle)}
                        className="mt-8 rounded-xl bg-red-600 px-8 py-3 font-black text-white transition-all hover:bg-red-700 shadow-xl"
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  <div className="mt-12 flex flex-col items-center gap-4 border-t border-foreground/10 pt-10 pb-5">
                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                      <a
                        href={selectedArticle.url}
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
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification */}      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-fade-in-up">
          <div className="flex items-center space-x-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-xl">
            <AlertCircle className="h-5 w-5" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
