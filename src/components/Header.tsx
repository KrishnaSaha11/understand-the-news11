'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { User, LogOut, BookMarked, UserCircle, Sun, Moon, Search, ChevronDown, Star, X, Flame, Menu } from 'lucide-react';
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
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
            setIsSearchOpen(false);
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
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background transition-colors duration-300">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 rounded-xl xl:hidden hover:bg-secondary transition-all text-muted-foreground"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <Link href="/" className="flex items-center space-x-2 shrink-0">
                        <span className="text-xl font-black tracking-tight text-white">Understand<span className="text-[#F59E0B]">News</span></span>
                    </Link>
                </div>

                <div className="flex-1 max-w-md mx-8 hidden lg:block">
                    <form onSubmit={handleSearch} className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search any niche (e.g. SpaceX, Yoga...)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-secondary/50 border-2 border-transparent focus:border-primary focus:bg-background rounded-2xl py-2.5 pl-10 pr-4 text-sm font-bold transition-all outline-none focus:ring-4 focus:ring-primary/10"
                        />
                    </form>
                </div>

                <nav className="hidden xl:flex items-center space-x-1 text-sm font-semibold uppercase tracking-tight">
                    {categories.slice(0, 3).map((cat) => (
                        <Link
                            key={cat.id}
                            href={cat.id === 'general' ? '/' : `/?category=${cat.id}`}
                            className={`px-3 py-2 rounded-xl transition-all hover:text-[#F9FAFB] flex items-center gap-2 ${currentCategory === cat.id && !currentQuery ? 'text-[#F59E0B]' : 'text-[#9CA3AF]'
                                }`}
                        >
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                        </Link>
                    ))}

                    <div className="relative">
                        <button
                            onClick={() => setShowCategories(!showCategories)}
                            className="px-3 py-2 rounded-xl transition-all hover:text-[#F9FAFB] flex items-center gap-2 text-[#9CA3AF]"
                        >
                            <ChevronDown className={`h-4 w-4 transition-transform ${showCategories ? 'rotate-180' : ''}`} />
                            <span>More</span>
                        </button>

                        {showCategories && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-card border border-border shadow-2xl rounded-2xl p-2 z-[60] animate-in fade-in slide-in-from-top-2">
                                <div className="grid gap-1">
                                    {categories.map((cat) => (
                                        <div key={cat.id} className="flex items-center justify-between group">
                                            <Link
                                                href={cat.id === 'general' ? '/' : `/?category=${cat.id}`}
                                                onClick={() => setShowCategories(false)}
                                                className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary transition-all text-sm font-bold ${currentCategory === cat.id ? 'text-primary' : 'text-muted-foreground'}`}
                                            >
                                                <span>{cat.icon}</span>
                                                <span>{cat.label}</span>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </nav>

                <div className="flex items-center space-x-2 sm:space-x-4">
                    <button
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        className="p-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-all lg:hidden"
                        aria-label="Toggle search"
                    >
                        <Search className="h-5 w-5" />
                    </button>

                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-all text-foreground/80 hover:text-primary border border-transparent hover:border-blue-100"
                        title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    >
                        {mounted && theme === 'dark' ? (
                            <Sun className="h-5 w-5" />
                        ) : (
                            <Moon className="h-5 w-5" />
                        )}
                    </button>

                    {user ? (
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            {/* Followed Topics Pinned */}
                            {mounted && user && followedTopics.length > 0 && (
                                <div className="hidden 2xl:flex items-center gap-2 border-l pl-4 border-secondary">
                                    {followedTopics.slice(0, 2).map((topic) => (
                                        <Link
                                            key={topic}
                                            href={`/?q=${encodeURIComponent(topic)}`}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/10 text-primary text-xs font-black transition-all hover:bg-primary hover:text-white"
                                        >
                                            <Star className="h-3 w-3 fill-current" />
                                            <span>{topic}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {stats.streak > 0 && (
                                <div className="flex items-center space-x-1 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full border border-orange-100 group transition-all hover:scale-105">
                                    <Flame className="h-4 w-4 fill-current animate-pulse group-hover:animate-bounce" />
                                    <span className="text-sm font-black">{stats.streak}</span>
                                </div>
                            )}
                            <Link
                                href="/library"
                                className="flex items-center space-x-2 rounded-xl bg-secondary/50 px-3 sm:px-4 py-2 text-sm font-black transition-all hover:bg-secondary"
                            >
                                <BookMarked className="h-4 w-4" />
                                <span className="hidden sm:inline">Library</span>
                            </Link>
                            <button
                                onClick={signOut}
                                className="flex items-center space-x-2 rounded-xl border-2 border-secondary px-3 sm:px-4 py-2 text-sm font-black transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-100"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="hidden sm:inline">Exit</span>
                            </button>
                            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary flex items-center justify-center text-white font-black text-sm sm:text-base">
                                {user.email?.[0].toUpperCase()}
                            </div>
                        </div>
                    ) : mounted ? (
                        <Link
                            href="/login"
                            className="rounded-full bg-foreground px-4 sm:px-6 py-2 sm:py-2.5 text-sm font-black text-background hover:scale-105 transition-all shadow-lg active:scale-95"
                        >
                            Sign In
                        </Link>
                    ) : (
                        <div className="h-10 w-24 bg-secondary/50 animate-pulse rounded-full" />
                    )}
                </div>
            </div>

            <div className="xl:hidden flex items-center space-x-2 overflow-x-auto no-scrollbar py-3 px-4 bg-background border-t border-border transition-colors duration-300">
                {categories.slice(0, 3).map((cat) => (
                    <Link
                        key={cat.id}
                        href={cat.id === 'general' ? '/' : `/?category=${cat.id}`}
                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${currentCategory === cat.id && !currentQuery
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-muted-foreground'
                            }`}
                    >
                        {cat.label}
                    </Link>
                ))}
                
                {/* More Dropdown for Mobile */}
                <div className="relative flex-shrink-0">
                    <button
                        onClick={() => setShowCategories(!showCategories)}
                        className={`px-4 py-1.5 rounded-full text-[13px] font-medium bg-secondary text-muted-foreground flex items-center gap-1`}
                    >
                        <span>More</span>
                        <ChevronDown className="h-3 w-3" />
                    </button>
                    {showCategories && (
                        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={() => setShowCategories(false)}>
                            <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl p-6 animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-black text-foreground">All Categories</h3>
                                    <button onClick={() => setShowCategories(false)} className="p-2 rounded-full bg-secondary text-foreground">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {categories.map((cat) => (
                                        <Link
                                            key={cat.id}
                                            href={cat.id === 'general' ? '/' : `/?category=${cat.id}`}
                                            onClick={() => setShowCategories(false)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold ${currentCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                                        >
                                            <span>{cat.icon}</span>
                                            <span>{cat.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Search Bar Expansion */}
            {isSearchOpen && (
                <div className="lg:hidden border-t border-border bg-background p-4 animate-in slide-in-from-top-2">
                    <form onSubmit={handleSearch} className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
                        <input
                            type="text"
                            autoFocus
                            placeholder="Search topics..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-secondary border-2 border-transparent focus:border-primary focus:bg-background rounded-xl py-3 pl-10 pr-4 text-sm font-bold transition-all outline-none text-foreground placeholder-muted-foreground"
                        />
                    </form>
                </div>
            )}

            {/* Mobile Side Menu */}
            {isMobileMenuOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm xl:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <div className="fixed top-0 left-0 bottom-0 w-[280px] bg-background z-[70] shadow-2xl xl:hidden animate-in slide-in-from-left duration-300">
                        <div className="p-6 space-y-8">
                            <div className="flex items-center justify-between">
                                <Link href="/" className="flex items-center space-x-2" onClick={() => setIsMobileMenuOpen(false)}>
                                    <span className="text-xl font-black tracking-tight">Understand<span className="text-primary">News</span></span>
                                </Link>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-xl hover:bg-secondary">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <nav className="space-y-2">
                                <p className="text-xs font-black uppercase tracking-widest text-foreground/40 px-3 mb-2">Categories</p>
                                {categories.map((cat) => (
                                    <Link
                                        key={cat.id}
                                        href={cat.id === 'general' ? '/' : `/?category=${cat.id}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold ${currentCategory === cat.id && !currentQuery ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'hover:bg-secondary'
                                            }`}
                                    >
                                        <span className="text-xl">{cat.icon}</span>
                                        <span>{cat.label}</span>
                                    </Link>
                                ))}
                            </nav>

                            {user && followedTopics.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-black uppercase tracking-widest text-foreground/40 px-3 mb-2">Your Topics</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {followedTopics.map((topic) => (
                                            <Link
                                                key={topic}
                                                href={`/?q=${encodeURIComponent(topic)}`}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 text-xs font-bold hover:bg-secondary transition-all"
                                            >
                                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                                <span className="truncate">{topic}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </header>
    );
}
