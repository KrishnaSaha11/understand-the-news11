'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, ArrowRight, Github, WifiOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

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

    const handleOAuth = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            router.push('/');
            router.refresh();
        } catch (err: any) {
            if (err?.code === 'auth/network-request-failed') {
                setError('Cannot connect to authentication server. Please check your internet connection.');
            } else {
                setError('Google sign-in failed. Please try again.');
            }
        }
    };

    const isSuccessMessage = error?.startsWith('✅');

    return (
        <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
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
                                className="w-full rounded-xl border-2 border-secondary bg-secondary/30 py-3 pl-10 pr-4 font-bold outline-none transition-all focus:border-blue-600 focus:bg-background"
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
                                className="w-full rounded-xl border-2 border-secondary bg-secondary/30 py-3 pl-10 pr-4 font-bold outline-none transition-all focus:border-blue-600 focus:bg-background"
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
                        className="group relative w-full flex items-center justify-center rounded-xl bg-foreground py-4 text-sm font-black text-background transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
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

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t"></div>
                    </div>
                    <div className="relative flex justify-center text-xs font-black uppercase tracking-widest">
                        <span className="bg-card px-4 text-foreground/40">Or continue with</span>
                    </div>
                </div>

                <button
                    onClick={handleOAuth}
                    className="flex w-full items-center justify-center space-x-3 rounded-xl border-2 border-secondary py-3 font-bold transition-all hover:bg-secondary/50"
                >
                    <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fillRule="evenodd" clipRule="evenodd" imageRendering="optimizeQuality" shapeRendering="geometricPrecision" textRendering="geometricPrecision" viewBox="0 0 800 800"><path d="M400 3v794H212c-49 0-94-20-128-54C50 709 30 664 30 615V185c0-49 20-94 54-128C118 23 163 3 212 3h188z" fill="#f2f2f2" /><path d="M800 357H400v77h228c-10 46-37 83-74 107-11-20-22-38-34-58 12-9 22-19 30-31 16-24 24-54 19-86H400v-91h400l-1 5" fill="#4285f4" /><path d="M400 357v141h153c3 6 8 11 11 16 11 18 22 37 34 58-37 28-86 45-139 45-97 0-180-66-210-153-29 55-57 110-86 164l-2 3c-11-20-22-42-32-62 13 25 28 48 44 69 46 60 119 98 200 98 100 0 184-33 245-89-1-1-3-4-5-6-11-20-22-38-34-58L557 514l-4-5v-11z" fill="#34a853" /><path d="M400 3v214c71 0 135 27 183 72l90-91C612 135 513 94 400 94c-81 0-154 39-200 99 15 28 30 57 45 86l31 59c30-88 113-154 210-154h-1l-6-5c-1-1 3-12 10-12 4-2 9-5 13-8l12-8zC318 43 234 102 189 193l-4 6-31-59C140 112 125 83 110 55v-6c16-22 33-41 52-60l232-1 6-5z" fill="#ea4335" /><path d="M400 617c-81 0-154-38-200-98-16-21-31-44-44-69 10 20 21 42 32 62l2-3c29-54 57-109 86-164l-26-49c-15-29-30-58-45-86l-1 2c45-91 129-150 228-169-19 37-37 75-55 113-24 50-48 99-71 149C160 382 160 416 190 448c30 87 113 153 210 153 53 0 102-17 139-45 14-11 27-24 38-40l60 21 54 86-1-1c-61 56-145 89-245 89a68 68 0 01-11 1z" fill="#fbbc05" /></svg>
                    <span>Google</span>
                </button>

                <div className="text-center">
                    <button
                        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
                        className="text-sm font-black text-blue-600 hover:underline"
                    >
                        {mode === 'signin'
                            ? "Don't have an account? Sign up"
                            : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
}
