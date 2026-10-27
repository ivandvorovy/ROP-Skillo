// app/api/lessons/[lessonId]/complete/route.ts
// POST /api/lessons/:lessonId/complete   (Authorization: Bearer <ID token>)
//
// Študent AJ učiteľ volajú túto route každý zvlášť po skončení lekcie
// ("lekcia prebehla"). Odpoveď { completed: false } znamená, že čaká na druhú
// stranu. Až pri druhom potvrdení vráti { completed: true } a body sa uvoľnia.
// Všetky podmienky kontroluje confirmLessonCompleted.
//
// Next.js 15: params je Promise, preto await. (V Next.js 14 je to bežný objekt,
// await na ňom nič nepokazí.)

import { requireUser } from '@/lib/auth';
import { handle } from '@/lib/http';
import { confirmLessonCompleted } from '@/lib/points';

export async function POST(req: Request, ctx: { params: Promise<{ lessonId: string }> }) {
  return handle(async () => {
    const { uid } = await requireUser(req);
    const { lessonId } = await ctx.params;
    const { completed } = await confirmLessonCompleted(lessonId, uid);
    return { ok: true, completed };
  });
}
