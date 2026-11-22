// POST /api/reports   telo: { targetType: 'user'|'document'|'review', targetId, reason, comment? }
// Prihlásený používateľ nahlási niečo adminovi. Podmienky kontroluje createReport.

import { requireUser } from '@/lib/auth';
import { handle } from '@/lib/http';
import { createReport } from '@/lib/reports';

export async function POST(req: Request) {
  return handle(async () => {
    const { uid } = await requireUser(req); // kto nahlasuje, berieme z tokenu
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    return createReport({
      reporterId: uid,
      targetType: body?.targetType,
      targetId: body?.targetId,
      reason: body?.reason,
      comment: body?.comment,
    });
  }, 201);
}