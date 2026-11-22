// lib/reports.ts
// Nahlásenie používateľa, dokumentu alebo hodnotenia. Spory o lekcie (dispute_...) vytvára cron,
// tu sú len nahlásenia od ľudí. Rozhoduje o nich admin.

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { HttpError } from '@/lib/http';

// Kam smerujú nahlásenia a v ktorej kolekcii cieľ hľadáme.
const TARGET_COLLECTION = { user: 'users', document: 'documents', review: 'reviews' } as const;
const REASONS = ['spam', 'inappropriate', 'fraud', 'other'] as const;

type TargetType = keyof typeof TARGET_COLLECTION;
type Reason = (typeof REASONS)[number];

export async function createReport(params: {
  reporterId: string;
  targetType: unknown; // prichádza z tela požiadavky, preto najprv všetko overíme
  targetId: unknown;
  reason: unknown;
  comment: unknown;
}): Promise<{ id: string }> {
  const { reporterId } = params;

  if (typeof params.targetType !== 'string' || !(params.targetType in TARGET_COLLECTION)) {
    throw new HttpError(400, 'Nahlásiť sa dá používateľ, dokument alebo hodnotenie');
  }
  const targetType = params.targetType as TargetType;

  // ID dokumentu nesmie obsahovať lomku, inak by Firestore hľadal podcestu.
  if (typeof params.targetId !== 'string' || params.targetId.length < 1 || params.targetId.length > 128 || params.targetId.includes('/')) {
    throw new HttpError(400, 'Neplatné ID cieľa');
  }
  const targetId = params.targetId;

  if (typeof params.reason !== 'string' || !REASONS.includes(params.reason as Reason)) {
    throw new HttpError(400, 'Neplatný dôvod nahlásenia');
  }
  const reason = params.reason as Reason;

  const comment = typeof params.comment === 'string' ? params.comment.trim() : '';
  if (comment.length > 500) throw new HttpError(400, 'Komentár môže mať najviac 500 znakov');

  if (targetType === 'user' && targetId === reporterId) {
    throw new HttpError(400, 'Nemôžeš nahlásiť sám seba');
  }

  // Nahlásiť sa dá len to, čo naozaj existuje.
  const target = await adminDb.collection(TARGET_COLLECTION[targetType]).doc(targetId).get();
  if (!target.exists) throw new HttpError(404, 'Nahlasovaný cieľ neexistuje');

  const id = `${reporterId}_${targetType}_${targetId}`;
  try {
    // create() zlyhá, ak dokument už existuje, takže druhé nahlásenie toho istého neprejde.
    await adminDb.collection('reports').doc(id).create({
      reporterId,
      targetType,
      targetId,
      reason,
      comment,
      status: 'open',
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    if ((e as { code?: number }).code === 6) throw new HttpError(409, 'Toto si už nahlásil');
    throw e;
  }
  return { id };
}