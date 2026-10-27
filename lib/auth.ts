// lib/auth.ts
// Overenie, kto volá API. Klient posiela Firebase ID token v hlavičke
// "Authorization: Bearer <token>". Identitu (uid) NIKDY neberieme z tela
// požiadavky, len z overeného tokenu, inak by sa dalo vydávať za iného.

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { HttpError } from '@/lib/http';

export async function requireUser(req: Request): Promise<{ uid: string }> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Chýba prihlásenie');

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    throw new HttpError(401, 'Neplatné alebo expirované prihlásenie');
  }
}

// Len pre adminov. Rola sa berie z profilu vo Firestore (users/{uid}.role), ktorý
// klient meniť nesmie (firestore.rules), takže si ju nikto nemôže sám nastaviť.
// Admina nastavíš ručne vo Firebase konzole: pole role = 'admin'.
export async function requireAdmin(req: Request): Promise<{ uid: string }> {
  const { uid } = await requireUser(req);
  const snap = await adminDb.collection('users').doc(uid).get();
  if (snap.get('role') !== 'admin') throw new HttpError(403, 'Len pre admina');
  return { uid };
}
