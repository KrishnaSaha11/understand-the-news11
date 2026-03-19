'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { TeacherLevel } from '@/services/ai';

interface UserStats {
    streak: number;
    totalRead: number;
    quizzesCompleted: number;
    totalQuizScore: number;
    totalQuizQuestions: number;
    knowledgePoints: number;
    articlesCompleted: string[];
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    level: TeacherLevel;
    stats: UserStats;
    setLevel: (level: TeacherLevel) => Promise<void>;
    updateStats: () => Promise<void>;
    signOut: () => Promise<void>;
    followedTopics: string[];
    setFollowedTopics: (topics: string[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    level: 'teenager',
    stats: {
        streak: 0,
        totalRead: 0,
        quizzesCompleted: 0,
        totalQuizScore: 0,
        totalQuizQuestions: 0,
        knowledgePoints: 0,
        articlesCompleted: []
    },
    setLevel: async () => { },
    updateStats: async () => { },
    signOut: async () => { },
    followedTopics: [],
    setFollowedTopics: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [level, setLevelState] = useState<TeacherLevel>('teenager');
    const [stats, setStats] = useState<UserStats>({
        streak: 0,
        totalRead: 0,
        quizzesCompleted: 0,
        totalQuizScore: 0,
        totalQuizQuestions: 0,
        knowledgePoints: 0,
        articlesCompleted: []
    });
    const [followedTopics, setFollowedTopicsState] = useState<string[]>([]);

    const fetchProfile = async () => {
        if (!auth.currentUser) return;
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch('/api/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text.substring(0, 500)); // Limit error message size
            }

            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                console.error('Expected JSON but got:', text.substring(0, 100));
                return;
            }

            const data = await res.json();

            if (data.profile?.preferred_level) {
                setLevelState(data.profile.preferred_level as TeacherLevel);
            }
            if (data.profile) {
                setStats({
                    streak: data.profile.streak || 0,
                    totalRead: data.profile.totalRead || 0,
                    quizzesCompleted: data.profile.quizzesCompleted || 0,
                    totalQuizScore: data.profile.totalQuizScore || 0,
                    totalQuizQuestions: data.profile.totalQuizQuestions || 0,
                    knowledgePoints: data.profile.knowledgePoints || 0,
                    articlesCompleted: data.profile.articlesCompleted || []
                });
            }
            if (data.preferences?.followed_topics) {
                setFollowedTopicsState(data.preferences.followed_topics);
            }
        } catch (err) {
            console.error('fetchProfile error:', err);
        }
    };

    const updateStats = async () => {
        await fetchProfile();
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await fetchProfile();
            } else {
                setLevelState('teenager');
                setStats({
                    streak: 0,
                    totalRead: 0,
                    quizzesCompleted: 0,
                    totalQuizScore: 0,
                    totalQuizQuestions: 0,
                    knowledgePoints: 0,
                    articlesCompleted: []
                });
                setFollowedTopicsState([]);
            }
            setLoading(false);
        }, (err) => {
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const setLevel = async (newLevel: TeacherLevel) => {
        setLevelState(newLevel);
        if (user) {
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
                        type: 'profile',
                        data: { preferred_level: newLevel }
                    })
                });
            } catch (err) {
                console.error('setLevel error:', err);
            }
        }
    };

    const setFollowedTopics = async (topics: string[]) => {
        setFollowedTopicsState(topics);
        if (user) {
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
                        data: { followed_topics: topics }
                    })
                });
            } catch (err) {
                console.error('setFollowedTopics error:', err);
            }
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (err) { }
        setUser(null);
        setLevelState('teenager');
        setStats({
            streak: 0,
            totalRead: 0,
            quizzesCompleted: 0,
            totalQuizScore: 0,
            totalQuizQuestions: 0,
            knowledgePoints: 0,
            articlesCompleted: []
        });
        setFollowedTopicsState([]);
    };

    return (
        <AuthContext.Provider value={{ user, loading, level, stats, setLevel, updateStats, signOut, followedTopics, setFollowedTopics }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
