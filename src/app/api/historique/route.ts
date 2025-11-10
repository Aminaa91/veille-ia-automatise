import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { historiqueVeille, veille, session } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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

export async function GET(request: NextRequest) {
  try {
    const userId = await validateAuth(request);
    if (!userId) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const veilleId = searchParams.get('veilleId');

    let query = db.select().from(historiqueVeille).where(eq(historiqueVeille.userId, userId));

    if (veilleId) {
      const veilleIdInt = parseInt(veilleId);
      if (isNaN(veilleIdInt)) {
        return NextResponse.json({ 
          error: 'Invalid veilleId parameter',
          code: 'INVALID_VEILLE_ID' 
        }, { status: 400 });
      }
      query = db.select()
        .from(historiqueVeille)
        .where(and(
          eq(historiqueVeille.userId, userId),
          eq(historiqueVeille.veilleId, veilleIdInt)
        ));
    }

    const results = await query
      .orderBy(desc(historiqueVeille.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await validateAuth(request);
    if (!userId) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { veilleId, contenu } = body;

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    if (!veilleId) {
      return NextResponse.json({ 
        error: 'veilleId is required',
        code: 'MISSING_VEILLE_ID' 
      }, { status: 400 });
    }

    if (!contenu || contenu.trim() === '') {
      return NextResponse.json({ 
        error: 'contenu is required and cannot be empty',
        code: 'MISSING_CONTENU' 
      }, { status: 400 });
    }

    const veilleIdInt = parseInt(veilleId);
    if (isNaN(veilleIdInt)) {
      return NextResponse.json({ 
        error: 'veilleId must be a valid integer',
        code: 'INVALID_VEILLE_ID' 
      }, { status: 400 });
    }

    const existingVeille = await db.select()
      .from(veille)
      .where(eq(veille.id, veilleIdInt))
      .limit(1);

    if (existingVeille.length === 0) {
      return NextResponse.json({ 
        error: 'Veille not found',
        code: 'VEILLE_NOT_FOUND' 
      }, { status: 404 });
    }

    if (existingVeille[0].userId !== userId) {
      return NextResponse.json({ 
        error: 'You do not have permission to add historique to this veille',
        code: 'FORBIDDEN' 
      }, { status: 403 });
    }

    const newHistorique = await db.insert(historiqueVeille)
      .values({
        veilleId: veilleIdInt,
        userId: userId,
        contenu: contenu.trim(),
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newHistorique[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}