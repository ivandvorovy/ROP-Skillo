// app/api/lessons/[lessonId]/cancel/route.ts
// POST /api/lessons/:lessonId/cancel   (Authorization: Bearer <ID token>)
//
// Zrušiť môže študent aj učiteľ. Body sa vrátia študentovi.
// Pravidlá neskorého zrušenia sa dopĺňajú v cancelLesson (lib/points.ts).

import { requireUser } from '@/lib/auth';
import { handle } from '@/lib/http';
import { cancelLesson } from '@/lib/points';

export async function POST(req: Request, ctx: { params: Promise<{ lessonId: string }> }) {
  return handle(async () => {
    const { uid } = await requireUser(req);
    const { lessonId } = await ctx.params;
    await cancelLesson(lessonId, uid);
    return { ok: true };
  });
}
