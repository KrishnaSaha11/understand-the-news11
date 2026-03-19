import React, { useState } from 'react';

interface DictionaryTextProps {
    text: string;
    tooltipWords?: { word: string; definition: string }[];
}

export default function DictionaryText({ text, tooltipWords }: DictionaryTextProps) {
    if (!text) return null;

    // Pattern to match [word|definition]
    const parts = text.split(/(\[[^\|\]]+\|[^\]]+\])/g);
    
    return (
        <span className="leading-relaxed">
            {parts.map((part, idx) => {
                const match = part.match(/^\[([^\|\]]+)\|([^\]]+)\]$/);
                if (match) {
                    const word = match[1];
                    const definition = match[2];
                    return (
                        <span key={idx} className="relative group inline-block cursor-help z-20">
                            <span className="border-b-2 border-dotted border-primary/40 text-primary font-black group-hover:bg-primary/10 transition-colors px-0.5 rounded-sm">
                                {word}
                            </span>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[220px] scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 origin-bottom 
                                bg-[#1E293B] text-[#F1F5F9] text-[13px] font-medium py-2 px-3 rounded-[8px] shadow-xl z-50 pointer-events-none whitespace-normal text-left leading-tight cursor-default">
                                {definition}
                                {/* Pointer arrow */}
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#1E293B]"></span>
                            </span>
                        </span>
                    );
                }
                
                // For normal text parts, scan for tooltip words
                if (tooltipWords && tooltipWords.length > 0) {
                    // Split the text into words while keeping punctuation
                    const subParts = part.split(/(\b(?:[a-zA-Z]+-?)+\b)/g);
                    return (
                        <span key={`text-${idx}`}>
                            {subParts.map((subPart, subIdx) => {
                                const lowerWord = subPart.toLowerCase();
                                const tooltipWord = tooltipWords.find(tw => tw.word.toLowerCase() === lowerWord);
                                
                                if (tooltipWord) {
                                    return (
                                        <span key={`tooltip-${idx}-${subIdx}`} className="relative group inline-block cursor-help z-20">
                                            <span className="border-b-2 border-dotted border-primary/40 text-primary font-black group-hover:bg-primary/10 transition-colors px-0.5 rounded-sm">
                                                {subPart}
                                            </span>
                                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[220px] scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 origin-bottom 
                                                bg-[#1E293B] text-[#F1F5F9] text-[13px] font-medium py-2 px-3 rounded-[8px] shadow-xl z-50 pointer-events-none whitespace-normal text-left leading-tight cursor-default">
                                                {tooltipWord.definition}
                                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#1E293B]"></span>
                                            </span>
                                        </span>
                                    );
                                }
                                return <span key={`raw-${idx}-${subIdx}`}>{subPart}</span>;
                            })}
                        </span>
                    );
                }
                
                return <span key={`raw-${idx}`}>{part}</span>;
            })}
        </span>
    );
}
