// POST /api/lessons/:lessonId/confirm   (Authorization: Bearer <ID token>)
// Učiteľ potvrdí žiadosť o lekciu (requested -> confirmed).
// Všetky podmienky kontroluje confirmLessonByTutor.

import { requireUser } from '@/lib/auth';
import { handle } from '@/lib/http';
import { confirmLessonByTutor } from '@/lib/lessons';

export async function POST(req: Request, ctx: { params: Promise<{ lessonId: string }> }) {
  return handle(async () => {
    const { uid } = await requireUser(req);
    const { lessonId } = await ctx.params;
    return confirmLessonByTutor(lessonId, uid);
  });
}