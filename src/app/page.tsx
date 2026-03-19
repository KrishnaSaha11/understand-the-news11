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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import OnboardingModal from '@/components/OnboardingModal';
import DictionaryText from '@/components/DictionaryText';

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
  const { user, level, setLevel, stats, updateStats, followedTopics, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const category = searchParams.get('category') || 'general';
  const query = searchParams.get('q') || '';
  
  const showOnboarding = (!authLoading && user && followedTopics.length < 5) || searchParams.get('onboarding') === 'true';

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
    backstory: string;
    why_it_matters: string;
    what_next: string;
    tooltip_words: { word: string; definition: string; }[];
    quiz: {
      question: string;
      options: string[];
      correct: string;
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
    // Convert index 0..3 to A..D
    const selectedLetter = String.fromCharCode(65 + optionIndex);
    const correct = selectedLetter === analysisResult.quiz.correct.charAt(0);
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
      if (authLoading) return; // Wait until auth state and preferred topics are loaded
      
      setLoading(true);
      try {
        let url = `/api/news?category=${category}`;
        if (query) {
           url = `/api/news?q=${encodeURIComponent(query)}`;
        } else if (category === 'general' && followedTopics.length > 0) {
           url = `/api/news?q=${encodeURIComponent(followedTopics.join(' OR '))}`;
        }
        
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
  }, [category, query, authLoading, followedTopics.join(',')]); // Refetch when dependencies change

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

      // Handle legacy cached format
      let mappedData = data;
      if (!data.quiz && data.quick_quiz) {
        mappedData = {
          hook: data.hook,
          what_happened: data.what_happened,
          backstory: data.backstory || data.why_it_happened || "",
          why_it_matters: data.why_it_matters,
          what_next: data.what_next || data.simple_explanation || "",
          tooltip_words: data.tooltip_words || (data.hard_words || []).map((hw: any) => ({ word: hw.word, definition: hw.meaning })),
          quiz: {
            question: data.quick_quiz.question,
            options: data.quick_quiz.options || [],
            correct: data.quick_quiz.correctIndex !== undefined ? ['A', 'B', 'C', 'D'][data.quick_quiz.correctIndex] || 'A' : 'A',
            explanation: data.quick_quiz.explanation || ""
          }
        };
      }

      setAnalysisResult(mappedData);

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
    <div className="container mx-auto px-4 py-8 sm:py-12 space-y-8 sm:space-y-12">
      {/* Stats Dashboard */}
      {user && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 animate-fade-in">
          <div className="relative overflow-hidden group rounded-[16px] bg-[#1D4ED8] p-4 sm:p-6 text-[#FFFFFF] shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all hover:scale-[1.02] active:scale-95">
            <div className="relative z-10 flex flex-col justify-between h-full space-y-2 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg">
                  <Brain className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-white/80">Explained</span>
              </div>
              <div>
                <div className="text-2xl sm:text-4xl font-black text-white">{stats.totalRead}</div>
                <div className="text-xs sm:text-sm font-bold text-white/80">Stories</div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden group rounded-[16px] bg-[#EA580C] p-4 sm:p-6 text-[#FFFFFF] shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all hover:scale-[1.02] active:scale-95">
            <div className="relative z-10 flex flex-col justify-between h-full space-y-2 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg">
                  <Zap className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-white/80">Streak</span>
              </div>
              <div>
                <div className="text-2xl sm:text-4xl font-black text-white">{stats.streak}</div>
                <div className="text-xs sm:text-sm font-bold text-white/80">Days</div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden group rounded-[16px] bg-[#059669] p-4 sm:p-6 text-[#FFFFFF] shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all hover:scale-[1.02] active:scale-95">
            <div className="relative z-10 flex flex-col justify-between h-full space-y-2 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg">
                  <Target className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-white/80">Mastery</span>
              </div>
              <div>
                <div className="text-2xl sm:text-4xl font-black text-white">{accuracy}%</div>
                <div className="text-xs sm:text-sm font-bold text-white/80">Accuracy</div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden group rounded-[16px] bg-[#7C3AED] p-4 sm:p-6 text-[#FFFFFF] shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all hover:scale-[1.02] active:scale-95">
            <div className="relative z-10 flex flex-col justify-between h-full space-y-2 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg">
                  <Trophy className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-white/80">Points</span>
              </div>
              <div>
                <div className="text-2xl sm:text-4xl font-black text-white">{stats.knowledgePoints}</div>
                <div className="text-xs sm:text-sm font-bold text-white/80">Knowledge</div>
              </div>
            </div>
          </div>
        </div>
      )}      {/* Hero Section with Level Selector */}
      <div className="text-center space-y-6 sm:space-y-8 animate-fade-in">
        <div className="space-y-3 sm:space-y-4">
          <h1 className="text-4xl font-black tracking-tight sm:text-7xl">
            Choose Your <span className="text-primary animate-pulse">Teacher</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base sm:text-xl font-bold text-foreground/60 px-4">
            Tell us how you want to learn today. We'll adjust the lessons to match your level perfectly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 px-4 w-full">
          {[
            { id: 'child', label: '👶 Simple', desc: 'ELI5 Mode' },
            { id: 'teenager', label: '🧑 Relatable', desc: 'Default Mode' },
            { id: 'expert', label: '🎓 In-depth', desc: 'Expert Mode' },
          ].map((lvl) => (
            <button
              key={lvl.id}
              onClick={() => setLevel(lvl.id as any)}
              className={`group flex flex-col items-center space-y-1 rounded-2xl border-4 p-4 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto sm:px-8 ${mounted && level === lvl.id
                ? 'border-primary bg-primary/5'
                : 'border-secondary bg-card hover:border-primary/20'
                }`}
            >
              <span className={`text-xl font-bold transition-colors ${level === lvl.id ? 'text-primary' : ''}`}>
                {lvl.label}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B7280]">
                {lvl.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Topic Cloud / Discover Section */}
      <div className="space-y-4 px-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-foreground/40">Discover Trending Niches</h2>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {trendingTopics.map((topic) => (
            <Link
              key={topic.id}
              href={`/?q=${encodeURIComponent(topic.label)}`}
              className="flex items-center space-x-2 rounded-xl sm:rounded-2xl bg-secondary/50 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-all hover:bg-primary hover:text-white hover:scale-105 active:scale-95"
            >
              <span>{topic.icon}</span>
              <span>{topic.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4 px-4">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
          {query ? (
            <>
              <span className="text-foreground/40 font-bold">Search results for:</span>
              <span className="text-primary">{query}</span>
            </>
          ) : category === 'general' && followedTopics.length > 0 ? (
            <>Your Curated Stories <span className="text-primary capitalize">For You</span></>
          ) : (
            <>Today's Top Stories <span className="text-primary capitalize">{category}</span></>
          )}
        </h1>
        <div className="text-xs sm:text-sm font-black text-foreground/40 px-3 py-1 bg-secondary/50 rounded-lg self-start sm:self-auto">
          {articles.length} {articles.length === 1 ? 'Article' : 'Articles'} found
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 px-4">
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
                    className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all border ${isSaved
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-[#374151] text-[#9CA3AF] bg-transparent hover:border-[#F59E0B] hover:text-[#F59E0B]'
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
                {/* Table of Contents - Sidebar on Large Screens */}
                <div className="lg:sticky lg:top-0 lg:h-[calc(92vh-73px)] lg:w-72 border-b lg:border-b-0 lg:border-r border-border bg-card p-6 overflow-y-auto hidden md:block transition-colors duration-300">
                  <div className="mb-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Jump to Section</h4>
                    <nav className="space-y-1">
                      {[
                        { id: 'hook', label: '🎬 Hook' },
                        { id: 'what', label: '🧠 What Happened' },
                        { id: 'why-happened', label: '⚡ Why It Happened' },
                        { id: 'matters', label: '🌍 Why It Matters' },
                        { id: 'simple', label: '🧒 Simple Explanation' },
                        { id: 'quiz', label: '🧠 Quick Quiz' },
                      ].map((item) => (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          className="group flex items-center px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-all relative"
                        >
                          <span className="absolute left-0 w-1 h-0 bg-primary transition-all duration-200 group-hover:h-full group-hover:opacity-100" />
                          {item.label}
                        </a>
                      ))}
                    </nav>
                  </div>

                  <div className="rounded-[16px] bg-[#1E3A5F] border-l-4 border-[#3B82F6] p-4 text-[#BFDBFE] shadow-lg mt-auto">
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#60A5FA] mb-1">TEACHER'S TIP</p>
                    <p className="text-sm font-medium">Take your time reading! This is a detailed look at the story.</p>
                  </div>
                </div>

                <div className="flex-1 p-4 sm:p-10 max-w-4xl mx-auto lg:mx-0 w-full">
                  <div className="mb-8 sm:mb-10 space-y-3 sm:space-y-4 animate-fade-in-up">
                    <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-black uppercase tracking-widest text-primary">
                      Friendly Teacher Mode
                    </span>
                    <h2 className="text-2xl font-black text-foreground sm:text-5xl leading-tight">
                      {selectedArticle.title}
                    </h2>
                    <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm font-bold text-foreground/60">
                      <span>{selectedArticle.source.name}</span>
                      <span className="h-1 w-1 rounded-full bg-foreground/30" />
                      <span>{new Date(selectedArticle.publishedAt).toLocaleDateString()}</span>
                      {analysisResult && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-foreground/30" />
                          <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            {(() => {
                                const textLengths = [analysisResult.hook, analysisResult.what_happened, analysisResult.backstory, analysisResult.why_it_matters, analysisResult.what_next].join(' ').split(' ').length;
                                const readTimeSeconds = Math.round((textLengths / 200) * 60);
                                if (readTimeSeconds <= 45) return "45 sec read";
                                if (readTimeSeconds < 90) return "1 min read";
                                return `${Math.round(readTimeSeconds / 60)} min read`;
                            })()}
                          </span>
                        </>
                      )}
                    </div>
                    {analysisResult && (
                      <div className="mt-4">
                        <SpeechPlayer
                          text={`${analysisResult.hook}. ${analysisResult.what_happened}. ${analysisResult.backstory}. ${analysisResult.why_it_matters}. ${analysisResult.what_next}.`}
                          currentLanguage={selectedLanguage}
                          onLanguageChange={handleLanguageChange}
                        />
                      </div>
                    )}
                  </div>

                  {analysisLoading ? (
                    <div className="flex flex-col items-center justify-center space-y-6 py-20 sm:py-32">
                      <div className="relative">
                        <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-primary" />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="animate-pulse text-xl sm:text-2xl font-black text-foreground">
                          Generating lesson<span className="animate-[ping_1.5s_infinite] inline-block">.</span><span className="animate-[ping_1.5s_infinite_200ms] inline-block">.</span><span className="animate-[ping_1.5s_infinite_400ms] inline-block">.</span>
                        </p>
                        <p className="text-foreground/50 text-sm sm:text-base font-medium italic">Our AI is crafting a simple, high-impact explanation just for you.</p>
                      </div>
                    </div>
                  ) : analysisResult ? (
                    <div className="space-y-8 sm:space-y-12 pb-10">
                      <div className="grid gap-6 sm:gap-8">
                        {/* Hook */}
                        <section id="hook" className="reading-section animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
                          <div className="rounded-2xl border-l-[4px] border-[#818CF8] bg-[rgba(129,140,248,0.05)] p-6 sm:p-8 shadow-sm">
                            <div className="flex items-center space-x-3 mb-4">
                              <h3 className="text-base sm:text-lg font-black text-[#1E293B] dark:text-[#A5B4FC] tracking-tight">🎬 THE HOOK</h3>
                            </div>
                            <div className="text-lg sm:text-xl font-bold text-[#1E293B] dark:text-[#A5B4FC] opacity-90">
                              <DictionaryText text={analysisResult.hook} tooltipWords={analysisResult.tooltip_words} />
                            </div>
                          </div>
                        </section>

                        {/* What Happened */}
                        <section id="what" className="reading-section animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                          <div className="rounded-2xl border-l-[4px] border-[#34D399] bg-[rgba(52,211,153,0.05)] p-6 sm:p-8 shadow-sm">
                            <div className="flex items-center space-x-3 mb-4">
                              <h3 className="text-base sm:text-lg font-black text-[#1E293B] dark:text-[#86EFAC] tracking-tight">🧠 WHAT HAPPENED</h3>
                            </div>
                            <div className="text-lg sm:text-xl font-bold text-[#1E293B] dark:text-[#86EFAC] opacity-90">
                              <DictionaryText text={analysisResult.what_happened} tooltipWords={analysisResult.tooltip_words} />
                            </div>
                          </div>
                        </section>

                        {/* Backstory */}
                        <section id="why-happened" className="reading-section animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                          <div className="rounded-2xl border-l-[4px] border-[#FBBF24] bg-[rgba(251,191,36,0.05)] p-6 sm:p-8 shadow-sm">
                            <div className="flex items-center space-x-3 mb-4">
                              <h3 className="text-base sm:text-lg font-black text-[#1E293B] dark:text-[#FBBF24] tracking-tight">🕰️ THE BACKSTORY</h3>
                            </div>
                            <div className="text-lg sm:text-xl font-bold text-[#1E293B] dark:text-[#FBBF24] opacity-90">
                              <DictionaryText text={analysisResult.backstory} tooltipWords={analysisResult.tooltip_words} />
                            </div>
                          </div>
                        </section>

                        {/* Why It Matters */}
                        <section id="matters" className="reading-section animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                          <div className="rounded-2xl border-l-[4px] border-[#60A5FA] bg-[rgba(96,165,250,0.05)] p-6 sm:p-8 shadow-sm">
                            <div className="flex items-center space-x-3 mb-4">
                              <h3 className="text-base sm:text-lg font-black text-[#1E293B] dark:text-[#60A5FA] tracking-tight">🌍 WHY THIS MATTERS TO YOU</h3>
                            </div>
                            <div className="text-lg sm:text-xl font-bold text-[#1E293B] dark:text-[#60A5FA] opacity-90">
                              <DictionaryText text={analysisResult.why_it_matters} tooltipWords={analysisResult.tooltip_words} />
                            </div>
                          </div>
                        </section>

                        {/* What Next */}
                        <section id="simple" className="reading-section animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
                          <div className="rounded-2xl border-l-[4px] border-[#F472B6] bg-[rgba(244,114,182,0.05)] p-6 sm:p-8 shadow-sm">
                            <div className="flex items-center space-x-3 mb-4">
                              <h3 className="text-base sm:text-lg font-black text-[#1E293B] dark:text-[#F472B6] tracking-tight">🔭 WHAT HAPPENS NEXT</h3>
                            </div>
                            <div className="text-lg sm:text-xl font-bold text-[#1E293B] dark:text-[#F472B6] opacity-90">
                              <DictionaryText text={analysisResult.what_next} tooltipWords={analysisResult.tooltip_words} />
                            </div>
                          </div>
                        </section>

                        {/* Integrated Quiz */}
                        <section id="quiz" className="reading-section animate-fade-in-up pt-8 border-t" style={{ animationDelay: '0.4s' }}>
                          <div className="rounded-3xl border-l-[4px] border-[#93C5FD] bg-[#EFF6FF] dark:bg-[#1A1F2B] p-6 sm:p-8 shadow-xl">
                            <div className="flex items-center space-x-3 mb-6">
                              <h3 className="text-lg sm:text-xl font-black text-[#1E293B] dark:text-[#93C5FD] tracking-tight">⚡ QUICK QUIZ</h3>
                            </div>

                            <div className="space-y-4 sm:space-y-6">
                              <h4 className="text-xl sm:text-2xl font-black leading-tight">
                                {analysisResult.quiz.question}
                              </h4>

                              <div className="grid gap-2 sm:gap-3">
                                {analysisResult.quiz.options.map((option, idx) => {
                                  const isSelected = selectedOption === idx;
                                  const selectedLetter = String.fromCharCode(65 + idx);
                                  const isCorrectOption = selectedLetter === analysisResult.quiz.correct.charAt(0);

                                  let appearance = "border-secondary bg-background hover:border-primary/20";
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
                                      className={`flex items-center justify-between rounded-xl sm:rounded-2xl border-2 sm:border-4 p-4 sm:p-5 text-left font-bold transition-all text-sm sm:text-base ${appearance}`}
                                    >
                                      <span>{option}</span>
                                      {selectedOption !== null && isCorrectOption && <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />}
                                      {selectedOption === idx && !isCorrectOption && <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>

                              {selectedOption !== null && (
                                <div className={`p-4 sm:p-5 rounded-2xl border-2 animate-in fade-in slide-in-from-top-4 mt-4 ${
                                  isCorrect ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-red-50/50 border-red-200 text-red-900'
                                }`}>
                                  <div className="flex items-start gap-3">
                                    {isCorrect ? <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />}
                                    <div>
                                      <h4 className="font-black text-lg mb-1">{isCorrect ? 'Correct!' : 'Not quite!'}</h4>
                                      <p className="font-medium text-sm sm:text-base opacity-90">{analysisResult.quiz.explanation}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {selectedOption !== null && (
                                <div className="mt-8 sm:mt-10 pt-8 sm:pt-10 border-t border-primary/10 animate-fade-in">
                                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <h3 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                                      <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                                      Continue Learning
                                    </h3>
                                  </div>

                                  <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
                                    {articles
                                      .filter(a => a.url !== selectedArticle.url && !stats.articlesCompleted.includes(a.url))
                                      .slice(0, 3)
                                      .map((recArticle, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => handleAnalyze(recArticle)}
                                          className="group flex flex-col items-center space-y-2 rounded-xl sm:rounded-2xl border-2 border-secondary bg-background p-2 sm:p-3 text-left transition-all hover:border-primary/20 hover:shadow-lg"
                                        >
                                          {recArticle.urlToImage && (
                                            <div className="aspect-video w-full overflow-hidden rounded-lg sm:rounded-xl">
                                              <img src={recArticle.urlToImage} alt="" className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                            </div>
                                          )}
                                          <h4 className="line-clamp-2 text-[10px] sm:text-xs font-black leading-tight group-hover:text-primary transition-colors">
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
                    <div className="py-10 sm:py-20 text-center rounded-2xl border-2 border-red-600 bg-red-600/10 p-6 sm:p-10 animate-fade-in-up">
                      <p className="text-2xl sm:text-3xl font-black text-red-600 uppercase mb-4">Error</p>
                      <p className="text-foreground mt-2 text-lg sm:text-xl font-bold">Failed to generate explanation. Please try again.</p>
                      <button
                        onClick={() => handleAnalyze(selectedArticle)}
                        className="mt-6 sm:mt-8 rounded-xl bg-red-600 px-6 sm:px-8 py-3 font-black text-white transition-all hover:bg-red-700 shadow-xl"
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  <div className="mt-8 sm:mt-12 flex flex-col items-center gap-4 border-t border-foreground/10 pt-8 sm:pt-10 pb-5">
                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                      <a
                        href={selectedArticle.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-center space-x-3 rounded-xl sm:rounded-2xl bg-foreground px-6 sm:px-8 py-4 sm:py-5 font-black text-background transition-all hover:scale-105 shadow-2xl text-sm sm:text-base"
                      >
                        <span>Read Full Original Article</span>
                        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 rotate-180 transition-transform group-hover:translate-x-1" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-fade-in-up">
          <div className="flex items-center space-x-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-xl">
            <AlertCircle className="h-5 w-5" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      {mounted && showOnboarding && (
        <OnboardingModal onComplete={() => router.replace('/')} />
      )}
    </div>
  );
}
