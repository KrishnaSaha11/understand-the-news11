'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Pause, Play, Loader2, Globe } from 'lucide-react';

interface SpeechPlayerProps {
    text: string;
    onLanguageChange?: (lang: string) => void;
    currentLanguage?: string;
}

const LANGUAGES = [
    { label: 'English', code: 'en-US', value: 'English' },
    { label: 'French', code: 'fr-FR', value: 'French' },
    { label: 'Spanish', code: 'es-ES', value: 'Spanish' },
    { label: 'German', code: 'de-DE', value: 'German' },
];

export default function SpeechPlayer({ text, onLanguageChange, currentLanguage = 'English' }: SpeechPlayerProps) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [supported, setSupported] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            setSupported(true);

            const loadVoices = () => {
                const availableVoices = window.speechSynthesis.getVoices();
                if (availableVoices.length > 0) {
                    setVoices(availableVoices);
                    console.log('Voices loaded:', availableVoices.length);
                }
            };

            loadVoices();
            // Critical for Chrome and some other browsers where getVoices is async
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }
        }

        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, []);

    const speak = () => {
        if (!supported) return;

        if (isPaused) {
            window.speechSynthesis.resume();
            setIsSpeaking(true);
            setIsPaused(false);
            return;
        }

        // Safety check - resume before canceling to ensure engine isn't stuck
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();

        const cleanText = text.replace(/['"]+/g, ' ');
        const utterance = new SpeechSynthesisUtterance(cleanText);

        const languageMap: { [key: string]: string } = {
            'english': 'en-US',
            'spanish': 'es-ES',
            'french': 'fr-FR',
            'german': 'de-DE'
        };

        const langCode = languageMap[currentLanguage.toLowerCase()] || 'en-US';
        utterance.lang = langCode;
        utterance.rate = 0.9; // Slightly faster for more natural feel
        utterance.pitch = 1;
        utterance.volume = 1;

        const trySpeak = () => {
            const availableVoices = window.speechSynthesis.getVoices();

            // Critical fix: For Hindi, some browsers use 'hi' and some use 'hi-IN'
            // We search for a voice that matches either exactly or starts with the lang prefix
            let matchedVoice = availableVoices.find(v => v.lang === langCode) ||
                availableVoices.find(v => v.lang.startsWith(langCode.split('-')[0]));


            if (matchedVoice) {
                utterance.voice = matchedVoice;
                utterance.lang = matchedVoice.lang; // Use the exact lang of the voice
                console.log('Using voice:', matchedVoice.name, 'for lang:', utterance.lang);
            } else {
                console.warn(`No native voice found for ${currentLanguage}. Using browser default for ${langCode}.`);
            }

            utterance.onstart = () => {
                console.log('Speech started');
                setIsSpeaking(true);
            };

            utterance.onend = () => {
                console.log('Speech ended');
                setIsSpeaking(false);
                setIsPaused(false);
            };

            utterance.onerror = (event) => {
                if (event.error === 'interrupted' || event.error === 'canceled') return;
                console.error('Speech error:', event.error);
                setIsSpeaking(false);
                setIsPaused(false);
            };

            utteranceRef.current = utterance;
            window.speechSynthesis.speak(utterance);
        };

        // Aggressive voice loading check
        if (window.speechSynthesis.getVoices().length === 0) {
            console.log('Voices not loaded yet, waiting...');
            const onVoicesLoaded = () => {
                window.speechSynthesis.onvoiceschanged = null;
                trySpeak();
            };
            window.speechSynthesis.onvoiceschanged = onVoicesLoaded;
            // Fallback for browsers that don't fire onvoiceschanged properly
            setTimeout(() => {
                if (window.speechSynthesis.getVoices().length > 0) {
                    trySpeak();
                }
            }, 500);
        } else {
            trySpeak();
        }
    };

    const pause = () => {
        if (window.speechSynthesis.speaking && !isPaused) {
            window.speechSynthesis.pause();
            setIsPaused(true);
            setIsSpeaking(false);
        }
    };

    const stop = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsPaused(false);
    };

    if (!supported) return null;

    return (
        <div className="flex flex-col space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                    <button
                        onClick={() => setShowLangMenu(!showLangMenu)}
                        className="flex items-center space-x-2 rounded-xl bg-secondary/50 px-3 py-2 text-xs font-black transition-all hover:bg-secondary border border-transparent hover:border-blue-200"
                    >
                        <Globe className="h-3 w-3 text-blue-600" />
                        <span>{currentLanguage}</span>
                    </button>

                    {showLangMenu && (
                        <div className="absolute bottom-full mb-2 left-0 z-50 w-32 rounded-2xl bg-card p-2 shadow-2xl border border-border glass animate-fade-in-up">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.value}
                                    onClick={() => {
                                        onLanguageChange?.(lang.value);
                                        setShowLangMenu(false);
                                        stop();
                                    }}
                                    className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold transition-all hover:bg-primary/10 hover:text-primary ${currentLanguage === lang.value ? 'bg-primary/10 text-primary' : 'text-foreground'
                                        }`}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-2 rounded-full bg-secondary/30 p-1 backdrop-blur-sm border border-border shadow-sm">
                    {!isSpeaking && !isPaused ? (
                        <button
                            onClick={speak}
                            className="flex items-center space-x-2 rounded-full bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white transition-all hover:scale-105 shadow-lg"
                        >
                            <Volume2 className="h-4 w-4 text-white" />
                            <span>Listen</span>
                        </button>
                    ) : (
                        <div className="flex items-center space-x-1">
                            {isSpeaking ? (
                                <button
                                    onClick={pause}
                                    className="flex items-center space-x-2 rounded-full bg-[#F59E0B] px-5 py-2 text-sm font-semibold text-black transition-all hover:scale-105"
                                >
                                    <Pause className="h-4 w-4 text-black" />
                                    <span>Pause</span>
                                </button>
                            ) : (
                                <button
                                    onClick={speak}
                                    className="flex items-center space-x-2 rounded-full bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white transition-all hover:scale-105"
                                >
                                    <Play className="h-4 w-4 text-white" />
                                    <span>Resume</span>
                                </button>
                            )}
                            <button
                                onClick={stop}
                                className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                title="Stop"
                            >
                                <VolumeX className="h-4 w-4" />
                            </button>
                            {isSpeaking && (
                                <div className="flex items-center space-x-1 px-2">
                                    <div className="h-1 w-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="h-2 w-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="h-1 w-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
