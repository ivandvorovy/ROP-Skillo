// app/api/admin/lessons/[lessonId]/resolve/route.ts
// POST /api/admin/lessons/:lessonId/resolve   (Authorization: Bearer <ID token admina>)
// telo: { resolution: 'pay_tutor' | 'refund_student' }
//
// Admin rozhodne spornú lekciu (status 'disputed'):
//  - pay_tutor: lekcia sa konala, body dostane učiteľ,
//  - refund_student: lekcia sa nekonala, body sa vrátia študentovi.
// Zoznam sporných lekcií pre admin UI = dotaz na lessons so status == 'disputed'.

import { requireAdmin } from '@/lib/auth';
import { handle, HttpError } from '@/lib/http';
import { resolveDispute, type DisputeResolution } from '@/lib/points';

export async function POST(req: Request, ctx: { params: Promise<{ lessonId: string }> }) {
  return handle(async () => {
    const { uid } = await requireAdmin(req);
    const { lessonId } = await ctx.params;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new HttpError(400, 'Neplatné telo požiadavky');

    await resolveDispute(lessonId, uid, body.resolution as DisputeResolution);
    return { ok: true };
  });
}
