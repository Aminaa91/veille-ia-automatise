import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { veille, historiqueVeille, session } from '@/db/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';

async function validateAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  const sessions = await db.select().from(session).where(eq(session.token, token)).limit(1);
  if (sessions.length === 0 || new Date(sessions[0].expiresAt) < new Date()) {
    return null;
  }
  return sessions[0].userId;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await validateAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { veilleId, sujet, contexte } = body;

    if (!veilleId) {
      return NextResponse.json(
        { error: 'veilleId is required', code: 'MISSING_VEILLE_ID' },
        { status: 400 }
      );
    }

    if (!sujet || !sujet.trim()) {
      return NextResponse.json(
        { error: 'sujet is required', code: 'MISSING_SUJET' },
        { status: 400 }
      );
    }

    // Verify veille exists and belongs to user
    const existingVeille = await db
      .select()
      .from(veille)
      .where(eq(veille.id, parseInt(veilleId)))
      .limit(1);

    if (existingVeille.length === 0) {
      return NextResponse.json(
        { error: 'Veille not found', code: 'VEILLE_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (existingVeille[0].userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured', 
          code: 'OPENAI_KEY_MISSING',
          message: 'Veuillez configurer la clé API OpenAI dans les variables d\'environnement'
        },
        { status: 500 }
      );
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build prompt
    let prompt = `Tu es un assistant spécialisé dans la veille et l'analyse d'informations. 

Sujet de la veille : ${sujet.trim()}`;

    if (contexte && contexte.trim()) {
      prompt += `\n\nContexte additionnel : ${contexte.trim()}`;
    }

    prompt += `\n\nGénère une veille complète et détaillée sur ce sujet. La veille doit inclure :
1. Un résumé exécutif
2. Les points clés et tendances actuelles
3. Les acteurs principaux et innovations récentes
4. Les enjeux et perspectives d'avenir
5. Des recommandations pratiques

Format la réponse de manière claire et structurée en français.`;

    // Generate content with OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en veille stratégique et analyse d\'informations. Tu fournis des analyses complètes, structurées et pertinentes en français.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const generatedContent = completion.choices[0]?.message?.content || '';

    if (!generatedContent.trim()) {
      return NextResponse.json(
        { error: 'No content generated', code: 'GENERATION_FAILED' },
        { status: 500 }
      );
    }

    // Update veille with result
    const now = new Date().toISOString();
    const updatedVeille = await db
      .update(veille)
      .set({
        resultat: generatedContent.trim(),
        updatedAt: now,
      })
      .where(eq(veille.id, parseInt(veilleId)))
      .returning();

    // Add to historique
    await db.insert(historiqueVeille).values({
      veilleId: parseInt(veilleId),
      userId: userId,
      contenu: generatedContent.trim(),
      createdAt: now,
    });

    return NextResponse.json(
      {
        success: true,
        veille: updatedVeille[0],
        content: generatedContent.trim(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Generate veille error:', error);
    
    // Handle OpenAI specific errors
    if (error?.status === 401) {
      return NextResponse.json(
        { 
          error: 'Invalid OpenAI API key', 
          code: 'OPENAI_AUTH_ERROR',
          message: 'La clé API OpenAI est invalide'
        },
        { status: 500 }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { 
          error: 'OpenAI rate limit exceeded', 
          code: 'OPENAI_RATE_LIMIT',
          message: 'Limite de requêtes OpenAI atteinte. Veuillez réessayer plus tard.'
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
