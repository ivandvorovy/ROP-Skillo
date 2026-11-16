// GET /api/skills: zoznam aktívnych zručností (pre "Ponúkam", "Hľadám" a rezervácie)
import { requireUser } from '@/lib/auth';
import { handle } from '@/lib/http';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(req: Request) {
  return handle(async () => {
    await requireUser(req); // musí byť prihlásený, uid tu nepotrebujeme

    const snap = await adminDb.collection('skills').where('status', '==', 'active').get();
    const skills = snap.docs
      .map((d) => ({ id: d.id, name: d.get('name') as string, category: d.get('category') as string }))
      // zoradenie robíme v kóde, aby sme nepotrebovali ďalší index vo Firestore
      .sort((a, b) => a.category.localeCompare(b.category, 'sk') || a.name.localeCompare(b.name, 'sk'));

    return { skills };
  });
}