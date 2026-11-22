// POST /api/lessons/:lessonId/review   telo: { rating: 1-5, comment?: string }
// Študent ohodnotí učiteľa po dokončenej lekcii. Podmienky kontroluje createReview.

import { requireUser } from '@/lib/auth';
import { handle } from '@/lib/http';
import { createReview } from '@/lib/reviews';

export async function POST(req: Request, ctx: { params: Promise<{ lessonId: string }> }) {
  return handle(async () => {
    const { uid } = await requireUser(req); // kto hodnotí, berieme z tokenu
    const { lessonId } = await ctx.params;
    const body = (await req.json().catch(() => null)) as { rating?: unknown; comment?: unknown } | null;
    return createReview({ lessonId, reviewerId: uid, rating: body?.rating, comment: body?.comment });
  }, 201);
}