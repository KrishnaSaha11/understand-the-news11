export interface GroqAnalysis {
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
}

export type TeacherLevel = 'child' | 'teenager' | 'expert';

export async function analyzeWithGroq(
    title: string,
    content: string | null,
    level: TeacherLevel = 'teenager',
    language: string = 'English'
): Promise<GroqAnalysis> {
    const apiKey = process.env.GROQ_API_KEY;
    const articleContent = content || title;

    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not configured");
    }

    const prompt = `You are a world-class news explainer. Your job is to make any news story 
feel like it was explained by a brilliant friend who reads everything — 
someone who gives you the real story, the context behind it, and why it 
matters, all in plain conversational language. No jargon. No fluff. 
No unnecessary words.

Your explanation must follow this EXACT structure. Each section must feel 
alive, not robotic. Write like a human, not a summarizer.

---

SECTION 1 — THE HOOK (2 sentences max)
Open with one punchy sentence that makes the reader lean forward. 
Make them feel something — surprise, curiosity, concern, or excitement. 
Do NOT start with the company name or "today". Start with the consequence 
or the surprise. Example: "Something just shifted in the crypto world — 
and if you follow digital money, this one matters."

---

SECTION 2 — WHAT HAPPENED (3-4 sentences)
Tell the story simply. Write it like you are texting a smart friend 
who has zero background on this topic. Use everyday words. If a 
technical term is absolutely necessary, put it in [brackets] so the 
frontend can show a tooltip definition on hover.
No bullet points. Pure flowing sentences.

---

SECTION 3 — THE BACKSTORY (3-4 sentences)
This is the most important section. Give the reader the context they 
need to actually understand WHY this news exists. What happened before? 
What is the bigger trend? What problem was building up that led to this 
moment? Assume the reader is intelligent but new to this topic. 
A reader should finish this section feeling like they now understand 
the full picture, not just today's headline.

---

SECTION 4 — WHY THIS MATTERS TO YOU (2-3 sentences)
Make it personal and real. How does this affect normal people — their 
money, their job, their daily life, their future? Skip abstract 
statements like "this is important for the industry." Be specific. 
If it does not affect normal people directly, say who it affects 
and why that ripples outward.

---

SECTION 5 — WHAT HAPPENS NEXT (2-3 sentences)
What should the reader watch for? What are the possible outcomes — 
good or bad? Keep it grounded in reality, not speculation. 
End with one sentence that makes the reader feel informed and ahead 
of others who just saw the headline.

---

QUICK QUIZ (1 question, 4 options)
Write one question that tests genuine understanding of the story — 
not a trivia fact. The correct answer should require the reader to 
have understood the WHY of the story, not just memorized a name or date.
Make wrong answers plausible, not obviously silly.

---

HARD RULES:
- Total word count: 180 to 230 words across all sections combined
- Zero use of: "In conclusion", "It is important to note", "As we know", "This is a reminder that", "Delve", "Navigate", "Landscape"
- Never start any sentence with "This"
- No bullet points anywhere except the quiz options
- Every section must connect to the next — it should read as one flowing story broken into clear chapters, not five separate summaries
- If a word is technical or uncommon, wrap it like this: [word|definition] so the frontend tooltip system can parse it
  Example: [blockchain|a digital record book that nobody can secretly edit]
- The tone is: smart friend at a coffee shop, not news anchor, not professor, not robot
- If the news involves money amounts, always give a real-world comparison.
  Example: instead of "$2 billion", write "$2 billion — roughly what India spends on space research in a year"
- First sentence of Section 1 must create an emotion. Test it: would a tired person at 11pm keep reading after this sentence? If no, rewrite it.
- RESPOND IN: ${language}

Article Title: ${title}
Article Content: ${articleContent}

OUTPUT FORMAT — return valid JSON exactly like this:

{
  "hook": "string",
  "what_happened": "string",
  "backstory": "string",
  "why_it_matters": "string",
  "what_next": "string",
  "tooltip_words": [
    { "word": "string", "definition": "string" }
  ],
  "quiz": {
    "question": "string",
    "options": ["A) string", "B) string", "C) string", "D) string"],
    "correct": "A/B/C/D",
    "explanation": "string — one sentence explaining why this answer is correct and what it means"
  }
}`;

    const fetchWithRetry = async (url: string, options: any, retries = 2) => {
        for (let i = 0; i < retries; i++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 45000);
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                clearTimeout(timeout);

                if (response.ok) return response;

                if (i === retries - 1) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`Groq API error: ${response.status} ${JSON.stringify(errorData)}`);
                }

                await new Promise(r => setTimeout(r, 1000));
            } catch (err) {
                if (i === retries - 1) throw err;
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        throw new Error("Failed to fetch from Groq API after multiple retries");
    };

    try {
        const response = await fetchWithRetry("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                max_tokens: 1000,
                temperature: 0.6
            })
        });

        const data = await response.json();
        const rawContent = data.choices[0].message.content;

        try {
            return JSON.parse(rawContent) as GroqAnalysis;
        } catch (e) {
            console.error("JSON parse failed:", rawContent);
            throw new Error("Failed to parse explanation from AI");
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error("Groq API request timed out");
        }
        throw error;
    }
}

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface QuizQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

/**
 * @deprecated Use integrated quiz in GroqAnalysis
 */
export async function generateQuizWithGroq(
    analysis: GroqAnalysis,
    level: TeacherLevel = 'teenager',
    difficulty: QuizDifficulty = 'medium'
): Promise<QuizQuestion[]> {
    // This function is kept for backward compatibility but will likely be removed
    return [analysis.quick_quiz];
}
