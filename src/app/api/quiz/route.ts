import { NextResponse } from 'next/server';
import { generateQuizWithGroq, TeacherLevel } from '@/services/ai';

export async function POST(req: Request) {
    try {
        const { analysis, level, difficulty } = await req.json();

        if (!analysis) {
            return NextResponse.json({ error: 'Analysis is required' }, { status: 400 });
        }

        const quiz = await generateQuizWithGroq(analysis, level as TeacherLevel, difficulty);
        return NextResponse.json(quiz);
    } catch (error: any) {
        console.error('Quiz API error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate quiz' }, { status: 500 });
    }
}
