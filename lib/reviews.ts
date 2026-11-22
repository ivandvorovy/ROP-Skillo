// lib/reviews.ts
// Hodnotenie učiteľa po dokončenej lekcii. Body tu nemeníme.

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { HttpError } from '@/lib/http';

export async function createReview(params: {
  lessonId: string;
  reviewerId: string;
  rating: unknown; // prichádza z tela požiadavky, preto najprv overíme typ
  comment: unknown;
}): Promise<{ ratingAvg: number; ratingCount: number }> {
  const { lessonId, reviewerId, rating } = params;

  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'Hodnotenie musí byť celé číslo od 1 do 5');
  }
  const comment = typeof params.comment === 'string' ? params.comment.trim() : '';
  if (comment.length > 500) throw new HttpError(400, 'Komentár môže mať najviac 500 znakov');

  return adminDb.runTransaction(async (tx) => {
    const lessonRef = adminDb.collection('lessons').doc(lessonId);
    // ID = lessonId_reviewerId zaručí, že jednu lekciu nehodnotí dvakrát tá istá osoba.
    const reviewRef = adminDb.collection('reviews').doc(`${lessonId}_${reviewerId}`);

    // V transakcii musia byť všetky čítania pred prvým zápisom.
    const lessonSnap = await tx.get(lessonRef);
    if (!lessonSnap.exists) throw new HttpError(404, 'Lekcia neexistuje');
    const lesson = lessonSnap.data() as { studentId: string; tutorId: string; status: string };

    if (lesson.studentId !== reviewerId) throw new HttpError(403, 'Lekciu môže hodnotiť len jej študent');
    if (lesson.status !== 'completed') throw new HttpError(409, 'Hodnotiť sa dá až dokončená lekcia');

    if ((await tx.get(reviewRef)).exists) throw new HttpError(409, 'Túto lekciu si už ohodnotil');

    const tutorRef = adminDb.collection('users').doc(lesson.tutorId);
    const tutorSnap = await tx.get(tutorRef);
    if (!tutorSnap.exists) throw new HttpError(404, 'Učiteľ neexistuje');

    // Nový priemer z doterajšieho priemeru a počtu (zaokrúhlený na 2 desatinné miesta).
    const oldAvg = (tutorSnap.get('ratingAvg') as number | undefined) ?? 0;
    const oldCount = (tutorSnap.get('ratingCount') as number | undefined) ?? 0;
    const ratingCount = oldCount + 1;
    const ratingAvg = Math.round(((oldAvg * oldCount + rating) / ratingCount) * 100) / 100;

    tx.set(reviewRef, {
      lessonId,
      reviewerId,
      tutorId: lesson.tutorId,
      rating,
      comment,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(tutorRef, { ratingAvg, ratingCount });

    return { ratingAvg, ratingCount };
  });
}