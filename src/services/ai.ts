export interface GroqAnalysis {
    hook: string;
    what_happened: string;
    why_it_happened: string;
    why_it_matters: string;
    simple_explanation: string;
    quick_quiz: {
        question: string;
        options: string[];
        correctIndex: number;
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

    const prompt = `You are an expert news explainer. Your job is to convert complex news into clear, engaging explanations that anyone can understand.

GOAL:
Help readers quickly understand the news while still giving enough context to feel fully informed.
Maximize the number of stories the user can consume by being punchy and powerful.

LANGUAGE RULES:
* Use very simple and natural English.
* Avoid jargon and complicated words.
* Write like a smart teacher explaining the news to a curious student.
* Make the explanation interesting and easy to read.

LENGTH RULES:
* Each section MUST be meaningful and detailed, containing MINIMUM 40 and MAXIMUM 50 words.
* Total explanation should be around 220–250 words.
* Provide full context and deep meaning in every section. If a section is too short, expand on the context.
* Use short but descriptive sentences.
* Avoid long paragraphs.

RESOND IN: ${language}

Article Title: ${title}
Article Content: ${articleContent}

STRICT STRUCTURE (Follow exactly and return ONLY JSON):
{
  "hook": "Write a powerful introduction that captures the reader's attention. YOU MUST USE AT LEAST 40 WORDS. (40-50 words)",
  "what_happened": "Explain the situation in detail. What are the key facts? YOU MUST USE AT LEAST 40 WORDS. (40-50 words)",
  "why_it_happened": "Explain the deep reasons, history, or causes. Provide full meaning. YOU MUST USE AT LEAST 40 WORDS. (40-50 words)",
  "why_it_matters": "Explain the impact on society or individuals. Why should the reader care? YOU MUST USE AT LEAST 40 WORDS. (40-50 words)",
  "simple_explanation": "Provide a detailed real-life comparison or analogy to make it crystal clear. YOU MUST USE AT LEAST 40 WORDS. (40-50 words)",
  "quick_quiz": {
    "question": "One multiple-choice question to test understanding.",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctIndex": 0,
    "explanation": "Why the answer is correct."
  }
}

TONE: Friendly, clear, and engaging. Not robotic.`;

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
