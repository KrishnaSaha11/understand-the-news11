'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Loader2, Sparkles, Check, CheckCircle2, Search, Plus } from 'lucide-react';

interface OnboardingModalProps {
    onComplete: () => void;
}

const PREDEFINED_TOPICS = [
    { id: 'tech', label: 'Technology', icon: '💻' },
    { id: 'ai', label: 'Artificial Intelligence', icon: '🤖' },
    { id: 'crypto', label: 'Crypto & Web3', icon: '⛓️' },
    { id: 'space', label: 'Space', icon: '🚀' },
    { id: 'science', label: 'Science', icon: '🔬' },
    { id: 'health', label: 'Health & Wellness', icon: '🧘' },
    { id: 'finance', label: 'Finance & Markets', icon: '📈' },
    { id: 'business', label: 'Business & Startups', icon: '🏢' },
    { id: 'politics', label: 'Politics', icon: '🏛️' },
    { id: 'climate', label: 'Climate Change', icon: '🌍' },
    { id: 'sports', label: 'Sports', icon: '⚽' },
    { id: 'gaming', label: 'Gaming', icon: '🎮' },
    { id: 'entertainment', label: 'Entertainment', icon: '🍿' },
    { id: 'travel', label: 'Travel', icon: '✈️' },
    { id: 'food', label: 'Food & Dining', icon: '🍔' },
];

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
    const { followedTopics, setFollowedTopics } = useAuth();
    const [selected, setSelected] = useState<string[]>(followedTopics.length > 0 ? followedTopics : []);
    const [customInput, setCustomInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const toggleTopic = (topic: string) => {
        setSelected(prev => {
            if (prev.includes(topic)) return prev.filter(t => t !== topic);
            if (prev.length >= 5) return prev; // Max 5 limit
            return [...prev, topic];
        });
    };

    const handleAddCustom = (e: React.FormEvent) => {
        e.preventDefault();
        const topic = customInput.trim();
        if (topic && !selected.includes(topic) && selected.length < 5) {
            setSelected(prev => [...prev, topic]);
            setCustomInput('');
        }
    };

    const handleSave = async () => {
        if (selected.length !== 5) return;
        setIsSaving(true);
        try {
            await setFollowedTopics(selected);
            onComplete();
        } catch (err) {
            console.error('Failed to save topics:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-3xl rounded-3xl bg-card border-2 border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 sm:p-10 border-b border-border text-center space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-primary to-emerald-500"></div>
                    <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-primary/10 rounded-2xl mb-2 text-primary animate-bounce-slow">
                        <Sparkles className="h-8 w-8 sm:h-10 sm:w-10" />
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
                        Personalize Your Feed
                    </h2>
                    <p className="text-base sm:text-lg font-bold text-muted-foreground max-w-xl mx-auto">
                        Select exactly <span className="text-primary font-black">5 interests</span> to curate the ultimate, noise-free news experience.
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-8 sm:p-10 bg-secondary/20">
                    <form onSubmit={handleAddCustom} className="mb-8 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Can't find your interest? Type it and press enter (e.g. 'Robotics')"
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            disabled={selected.length >= 5}
                            className="w-full bg-background border-2 border-border focus:border-primary rounded-2xl py-4 pl-12 pr-12 text-base font-bold transition-all outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!customInput.trim() || selected.length >= 5}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    </form>

                    <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
                        {/* Render Custom Selected Topics that are NOT in PREDEFINED_TOPICS */}
                        {selected.filter(topic => !PREDEFINED_TOPICS.some(t => t.label === topic)).map(topic => (
                             <button
                                key={topic}
                                onClick={() => toggleTopic(topic)}
                                className={`group flex items-center gap-2 rounded-2xl border-4 px-5 py-3 text-sm sm:text-base font-black transition-all hover:scale-105 active:scale-95 border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30`}
                            >
                                <span>🎯</span>
                                <span>{topic}</span>
                                <CheckCircle2 className="h-5 w-5 ml-1" />
                            </button>
                        ))}
                        
                        {/* Render Predefined Topics */}
                        {PREDEFINED_TOPICS.map((topic) => {
                            const isSelected = selected.includes(topic.label);
                            const isDisabled = !isSelected && selected.length >= 5;

                            return (
                                <button
                                    key={topic.id}
                                    onClick={() => toggleTopic(topic.label)}
                                    disabled={isDisabled}
                                    className={`group flex items-center gap-2 rounded-2xl border-4 px-5 py-3 text-sm sm:text-base font-black transition-all ${
                                        isSelected
                                            ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
                                            : isDisabled
                                                ? 'border-transparent bg-secondary/50 text-muted-foreground opacity-50 cursor-not-allowed'
                                                : 'border-transparent bg-background text-foreground hover:border-primary/30 hover:bg-secondary hover:scale-105 active:scale-95 shadow-sm'
                                        }`}
                                >
                                    <span className="text-xl">{topic.icon}</span>
                                    <span>{topic.label}</span>
                                    {isSelected && <CheckCircle2 className="h-5 w-5 ml-1 animate-in zoom-in" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6 sm:p-8 border-t border-border bg-card flex flex-col items-center gap-4">
                    <div className="flex gap-2 mb-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div 
                                key={i} 
                                className={`h-3 w-10 sm:w-16 rounded-full transition-all duration-300 ${i <= selected.length ? 'bg-primary' : 'bg-secondary'}`}
                            />
                        ))}
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={selected.length !== 5 || isSaving}
                        className={`w-full sm:w-auto relative overflow-hidden rounded-2xl px-12 py-4 font-black text-lg transition-all shadow-xl
                        ${selected.length === 5 
                            ? 'bg-primary text-primary-foreground hover:scale-105 hover:shadow-primary/50 cursor-pointer' 
                            : 'bg-secondary text-muted-foreground cursor-not-allowed'}`}
                    >
                        {isSaving ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-6 w-6 animate-spin" /> Saving...
                            </span>
                        ) : selected.length === 5 ? (
                            <span className="flex items-center justify-center gap-2">
                                Complete Setup <Check className="h-6 w-6" />
                            </span>
                        ) : (
                            <span>Select {5 - selected.length} more {5 - selected.length === 1 ? 'topic' : 'topics'}</span>
                        )}
                        
                        {/* Shine effect when ready */}
                        {selected.length === 5 && !isSaving && (
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
