// app/api/documents/[documentId]/purchase/route.ts
// POST /api/documents/:documentId/purchase   (Authorization: Bearer <ID token>)
//
// Kúpa študijného materiálu za body. Samotné zobrazenie dokumentu s watermarkom
// je Filipov modul a bude si pred zobrazením overovať existenciu záznamu
// document_purchases/{documentId}_{uid}, ktorý táto route vytvára.

import { requireUser } from '@/lib/auth';
import { handle } from '@/lib/http';
import { purchaseDocument } from '@/lib/points';

export async function POST(req: Request, ctx: { params: Promise<{ documentId: string }> }) {
  return handle(async () => {
    const { uid } = await requireUser(req);
    const { documentId } = await ctx.params;
    const { pricePaid } = await purchaseDocument(uid, documentId);
    return { ok: true, pricePaid };
  }, 201);
}
