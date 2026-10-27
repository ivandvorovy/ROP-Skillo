// app/api/lessons/route.ts
// POST /api/lessons   (Authorization: Bearer <ID token>)
// telo: { tutorId, skillId, startsAt (ISO reťazec), durationMin, difficulty }
//
// Študent požiada o lekciu: vznikne lekcia v stave 'requested' a body sa mu zablokujú.
// studentId sa berie z tokenu, nikdy z tela, inak by sa dalo "kupovať" za cudzí účet.

import { requireUser } from '@/lib/auth';
import { handle, HttpError } from '@/lib/http';
import { requestLesson, type Difficulty } from '@/lib/points';

export async function POST(req: Request) {
  return handle(async () => {
    const { uid } = await requireUser(req);

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new HttpError(400, 'Neplatné telo požiadavky');

    // Podrobná validácia (dĺžka, budúci termín, náročnosť...) je v requestLesson.
    return requestLesson({
      studentId: uid,
      tutorId: String(body.tutorId ?? ''),
      skillId: String(body.skillId ?? ''),
      startsAt: new Date(String(body.startsAt ?? '')),
      durationMin: Number(body.durationMin),
      difficulty: body.difficulty as Difficulty,
    });
  }, 201);
}
