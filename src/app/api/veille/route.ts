import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { veille, session } from '@/db/schema';
import { eq, like, or, and, desc } from 'drizzle-orm';

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

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json(
        { 
          error: 'User ID cannot be provided in request body',
          code: 'USER_ID_NOT_ALLOWED' 
        },
        { status: 400 }
      );
    }

    const { titre, sujet, contexte, resultat } = body;

    if (!titre || !titre.trim()) {
      return NextResponse.json(
        { error: 'Titre is required', code: 'MISSING_TITRE' },
        { status: 400 }
      );
    }

    if (!sujet || !sujet.trim()) {
      return NextResponse.json(
        { error: 'Sujet is required', code: 'MISSING_SUJET' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const newVeille = await db.insert(veille).values({
      userId,
      titre: titre.trim(),
      sujet: sujet.trim(),
      contexte: contexte?.trim() || null,
      resultat: resultat?.trim() || null,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(newVeille[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await validateAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');

    let query = db.select().from(veille).where(eq(veille.userId, userId));

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(
        and(
          eq(veille.userId, userId),
          or(
            like(veille.titre, searchTerm),
            like(veille.sujet, searchTerm)
          )
        )
      );
    }

    const results = await query
      .orderBy(desc(veille.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}