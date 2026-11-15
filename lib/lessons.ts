// lib/lessons.ts
// Životný cyklus lekcie mimo bodov. Body mení výhradne lib/points.ts,
// preto tu žiadne body nemeníme.

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { HttpError } from '@/lib/http';

// Učiteľ potvrdí žiadosť o lekciu: requested -> confirmed.
// Prečo transakcia: medzi čítaním a zápisom mohol študent lekciu zrušiť.
// Transakcia by pri takom konflikte kontrolu zopakovala a zistila by nový stav.
export async function confirmLessonByTutor(
  lessonId: string,
  tutorId: string,
): Promise<{ status: 'confirmed' }> {
  await adminDb.runTransaction(async (tx) => {
    const ref = adminDb.collection('lessons').doc(lessonId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, 'Lekcia neexistuje');

    const lesson = snap.data() as { tutorId: string; status: string; startsAt: Timestamp };

    // Potvrdiť smie len učiteľ tejto lekcie (uid berieme z tokenu, nie z tela požiadavky).
    if (lesson.tutorId !== tutorId) throw new HttpError(403, 'Lekciu môže potvrdiť len jej učiteľ');
    if (lesson.status !== 'requested') throw new HttpError(409, 'Lekcia nie je v stave "požiadaná"');
    // Lekciu, ktorej termín už začal, nemá zmysel potvrdzovať.
    if (lesson.startsAt.toMillis() <= Date.now()) throw new HttpError(409, 'Termín lekcie už začal alebo uplynul');

    tx.update(ref, { status: 'confirmed', confirmedAt: FieldValue.serverTimestamp() });
  });

  return { status: 'confirmed' };
}