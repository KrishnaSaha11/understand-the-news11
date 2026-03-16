'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, ArrowRight, WifiOff } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === 'signup') {
                await createUserWithEmailAndPassword(auth, email, password);
                router.push('/');
                router.refresh();
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                router.push('/');
                router.refresh();
            }
        } catch (error: any) {
            // Handle network/connection errors specifically
            if (error?.code === 'auth/network-request-failed') {
                setError('Cannot connect to authentication server. Please check your internet connection or try again later.');
            } else if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/wrong-password') {
                setError('Incorrect email or password. Please try again.');
            } else if (error?.code === 'auth/email-already-in-use') {
                setError('This email is already registered. Please sign in instead.');
            } else {
                setError(error?.message || 'Authentication failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const isSuccessMessage = error?.startsWith('✅');

    return (
        <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 bg-background">
            <div className="w-full max-w-md space-y-8 rounded-3xl border bg-card p-8 shadow-2xl animate-fade-in-up">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-foreground">
                        {mode === 'signin' ? 'Welcome Back!' : 'Join the Classroom'}
                    </h1>
                    <p className="text-foreground/60 font-medium">
                        {mode === 'signin'
                            ? "Sign in to access your saved news stories."
                            : "Start your journey to understanding the world better."}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40" />
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full rounded-xl border-2 border-secondary bg-secondary/30 py-3.5 pl-10 pr-4 font-bold outline-none transition-all focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10"
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40" />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full rounded-xl border-2 border-secondary bg-secondary/30 py-3.5 pl-10 pr-4 font-bold outline-none transition-all focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className={`rounded-xl p-4 text-sm font-bold border ${isSuccessMessage
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : error.includes('Cannot connect')
                                ? 'bg-amber-50 text-amber-700 border-amber-100'
                                : 'bg-red-50 text-red-600 border-red-100'
                            }`}>
                            <div className="flex items-start space-x-2">
                                {error.includes('Cannot connect') && <WifiOff className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                                <span>{error}</span>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex items-center justify-center rounded-xl bg-primary py-4 text-sm font-black text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/20"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center pt-4">
                    <button
                        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
                        className="text-sm font-black text-primary hover:underline"
                    >
                        {mode === 'signin'
                            ? "Don't have an account? Sign up"
                            : "Already have an account? Sign in"}
                    </button>
                    <div className="mt-4">
                        <Link href="/" className="text-xs font-bold text-foreground/40 hover:text-primary transition-colors">
                            ← Back to home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
