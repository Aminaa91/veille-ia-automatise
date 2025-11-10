import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { veille, session } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await validateAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const result = await db
      .select()
      .from(veille)
      .where(eq(veille.id, parseInt(id)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Veille not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (result[0].userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    return NextResponse.json(result[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await validateAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json(
        {
          error: 'User ID cannot be provided in request body',
          code: 'USER_ID_NOT_ALLOWED',
        },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(veille)
      .where(eq(veille.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Veille not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (existing[0].userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const updates: Partial<typeof veille.$inferInsert> = {};

    if (body.titre !== undefined) {
      if (typeof body.titre !== 'string' || body.titre.trim() === '') {
        return NextResponse.json(
          { error: 'Titre must be a non-empty string', code: 'INVALID_TITRE' },
          { status: 400 }
        );
      }
      updates.titre = body.titre.trim();
    }

    if (body.sujet !== undefined) {
      if (typeof body.sujet !== 'string' || body.sujet.trim() === '') {
        return NextResponse.json(
          { error: 'Sujet must be a non-empty string', code: 'INVALID_SUJET' },
          { status: 400 }
        );
      }
      updates.sujet = body.sujet.trim();
    }

    if (body.contexte !== undefined) {
      if (body.contexte !== null && typeof body.contexte !== 'string') {
        return NextResponse.json(
          { error: 'Contexte must be a string or null', code: 'INVALID_CONTEXTE' },
          { status: 400 }
        );
      }
      updates.contexte = body.contexte === null ? null : body.contexte.trim();
    }

    if (body.resultat !== undefined) {
      if (body.resultat !== null && typeof body.resultat !== 'string') {
        return NextResponse.json(
          { error: 'Resultat must be a string or null', code: 'INVALID_RESULTAT' },
          { status: 400 }
        );
      }
      updates.resultat = body.resultat === null ? null : body.resultat.trim();
    }

    updates.updatedAt = new Date().toISOString();

    const updated = await db
      .update(veille)
      .set(updates)
      .where(and(eq(veille.id, parseInt(id)), eq(veille.userId, userId)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Update failed', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await validateAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(veille)
      .where(eq(veille.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Veille not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (existing[0].userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const deleted = await db
      .delete(veille)
      .where(and(eq(veille.id, parseInt(id)), eq(veille.userId, userId)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Delete failed', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Veille deleted successfully',
        deleted: deleted[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}