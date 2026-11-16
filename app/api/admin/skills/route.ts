// POST /api/admin/skills   telo: { name, category }
// Zručnosti vytvára len admin, aby neboli duplicity typu "Python" a "python".
import { FieldValue } from 'firebase-admin/firestore';
import { requireAdmin } from '@/lib/auth';
import { handle, HttpError } from '@/lib/http';
import { adminDb } from '@/lib/firebase-admin';

// "Grafický dizajn" -> "graficky-dizajn" (rovnaký štýl ID ako v seed-skills.ts)
function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // odstráni diakritiku
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin(req);

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const name = String(body?.name ?? '').trim();
    const category = String(body?.category ?? '').trim();

    if (name.length < 2 || name.length > 40) throw new HttpError(400, 'Názov musí mať 2 až 40 znakov');
    if (category.length < 2 || category.length > 40) throw new HttpError(400, 'Kategória musí mať 2 až 40 znakov');

    const id = slugify(name);
    if (!id) throw new HttpError(400, 'Neplatný názov');

    const ref = adminDb.collection('skills').doc(id);
    if ((await ref.get()).exists) throw new HttpError(409, 'Takáto zručnosť už existuje');

    await ref.set({ name, category, status: 'active', createdAt: FieldValue.serverTimestamp() });
    return { id };
  }, 201);
}