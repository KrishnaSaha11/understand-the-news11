'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { User, LogOut, BookMarked, UserCircle, Sun, Moon, Search, ChevronDown, Star, X, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { auth } from '@/lib/firebase';

export default function Header() {
    const { user, signOut, stats } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCategories, setShowCategories] = useState(false);
    const [followedTopics, setFollowedTopics] = useState<string[]>([]);
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentCategory = searchParams.get('category') || 'general';
    const currentQuery = searchParams.get('q') || '';

    useEffect(() => {
        setMounted(true);
        if (user) {
            fetchFollowedTopics(user.uid);
        }
    }, [user]);

    const fetchFollowedTopics = async (uid: string) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) return;

            const res = await fetch('/api/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();

            if (data.preferences?.followed_topics) {
                setFollowedTopics(data.preferences.followed_topics);
            }
        } catch (err) {
            console.error('Error fetching topics:', err);
        }
    };

    const toggleFollowTopic = async (topic: string) => {
        if (!user) return;
        const newTopics = followedTopics.includes(topic)
            ? followedTopics.filter(t => t !== topic)
            : [...followedTopics, topic];

        setFollowedTopics(newTopics);
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) return;

            await fetch('/api/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: 'preferences',
                    data: { followed_topics: newTopics }
                })
            });
        } catch (err) {
            console.error('Error saving topics:', err);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery('');
        }
    };

    const categories = [
        { id: 'general', label: 'World', icon: '🌍' },
        { id: 'business', label: 'Business', icon: '💼' },
        { id: 'technology', label: 'Tech', icon: '🚀' },
        { id: 'science', label: 'Science', icon: '🧪' },
        { id: 'sports', label: 'Sports', icon: '⚽' },
        { id: 'health', label: 'Health', icon: '🏥' },
        { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b glass bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center space-x-2 shrink-0">
                    <span className="text-xl font-black tracking-tight">Understand<span className="text-blue-600">News</span></span>
                </Link>

                <div className="flex-1 max-w-md mx-8 hidden lg:block">
                    <form onSubmit={handleSearch} className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 group-focus-within:text-blue-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search any niche (e.g. SpaceX, Yoga...)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-secondary/50 border-2 border-transparent focus:border-blue-600/20 focus:bg-background rounded-2xl py-2 pl-10 pr-4 text-sm font-bold transition-all outline-none"
                        />
                    </form>
                </div>

                <nav className="hidden xl:flex items-center space-x-1 text-sm font-black uppercase tracking-tight">
                    {categories.slice(0, 4).map((cat) => (
                        <div key={cat.id} className="relative group">
                            <Link
                                href={cat.id === 'general' ? '/' : `/?category=${cat.id}`}
                                className={`px-3 py-2 rounded-xl transition-all hover:bg-secondary flex items-center gap-2 ${currentCategory === cat.id && !currentQuery ? 'text-blue-600 bg-secondary' : 'text-foreground/60'
                                    }`}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.label}</span>
                            </Link>
                        </div>
                    ))}

                    <div className="relative">
                        <button
                            onClick={() => setShowCategories(!showCategories)}
                            className="px-3 py-2 rounded-xl transition-all hover:bg-secondary flex items-center gap-2 text-foreground/60"
                        >
                            <ChevronDown className={`h-4 w-4 transition-transform ${showCategories ? 'rotate-180' : ''}`} />
                            <span>More</span>
                        </button>

                        {showCategories && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-background border-2 border-secondary shadow-2xl rounded-2xl p-2 z-[60] animate-in fade-in slide-in-from-top-2">
                                <div className="grid gap-1">
                                    {categories.map((cat) => (
                                        <div key={cat.id} className="flex items-center justify-between group">
                                            <Link
                                                href={cat.id === 'general' ? '/' : `/?category=${cat.id}`}
                                                onClick={() => setShowCategories(false)}
                                                className="flex-1 flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary transition-all text-sm font-bold"
                                            >
                                                <span>{cat.icon}</span>
                                                <span>{cat.label}</span>
                                            </Link>
                                            {mounted && user && (
                                                <button
                                                    onClick={() => toggleFollowTopic(cat.label)}
                                                    className={`p-2 rounded-lg transition-all ${followedTopics.includes(cat.label) ? 'text-yellow-500 opacity-100' : 'text-foreground/20 hover:text-yellow-500 opacity-0 group-hover:opacity-100'}`}
                                                >
                                                    <Star className={`h-4 w-4 ${followedTopics.includes(cat.label) ? 'fill-current' : ''}`} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </nav>
                {user ? (
                    <div className="flex items-center space-x-4">
                        {/* Theme Toggle Button */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-all text-foreground/80 hover:text-blue-600 border border-transparent hover:border-blue-100"
                            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                        >
                            {mounted && theme === 'dark' ? (
                                <Sun className="h-5 w-5" />
                            ) : (
                                <Moon className="h-5 w-5" />
                            )}
                        </button>

                        {/* Followed Topics Pinned */}
                        {mounted && user && followedTopics.length > 0 && (
                            <div className="hidden 2xl:flex items-center gap-2 border-l pl-4 border-secondary">
                                {followedTopics.slice(0, 2).map((topic) => (
                                    <Link
                                        key={topic}
                                        href={`/?q=${encodeURIComponent(topic)}`}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/10 text-blue-600 text-xs font-black transition-all hover:bg-blue-600 hover:text-white"
                                    >
                                        <Star className="h-3 w-3 fill-current" />
                                        <span>{topic}</span>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Theme Toggle Button */}
                        {stats.streak > 0 && (
                            <div className="flex items-center space-x-1 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full border border-orange-100 group transition-all hover:scale-105">
                                <Flame className="h-4 w-4 fill-current animate-pulse group-hover:animate-bounce" />
                                <span className="text-sm font-black">{stats.streak}</span>
                            </div>
                        )}
                        <Link
                            href="/library"
                            className="flex items-center space-x-2 rounded-xl bg-secondary/50 px-4 py-2 text-sm font-black transition-all hover:bg-secondary"
                        >
                            <BookMarked className="h-4 w-4" />
                            <span className="hidden sm:inline">Library</span>
                        </Link>
                        <button
                            onClick={signOut}
                            className="flex items-center space-x-2 rounded-xl border-2 border-secondary px-4 py-2 text-sm font-black transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-100"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">Exit</span>
                        </button>
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black">
                            {user.email?.[0].toUpperCase()}
                        </div>
                    </div>
                ) : mounted ? (
                    <Link
                        href="/login"
                        className="rounded-full bg-foreground px-6 py-2.5 text-sm font-black text-background hover:scale-105 transition-all shadow-lg active:scale-95"
                    >
                        Sign In
                    </Link>
                ) : (
                    <div className="h-10 w-24 bg-secondary/50 animate-pulse rounded-full" />
                )}
            </div>
        </header>
    );
}
