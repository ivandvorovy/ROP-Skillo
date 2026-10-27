// app/api/auth/welcome-bonus/route.ts
// POST /api/auth/welcome-bonus   (hlavička Authorization: Bearer <ID token>)
//
// Klient ju zavolá po tom, čo používateľ klikol na overovací odkaz v e-maile.
// Stav overenia sa berie z Firebase Auth (getUser), NIE z tokenu: token má
// e_mail_verified zamrznutý na čas vydania a hneď po overení by ešte hovoril "false".

import { adminAuth } from '@/lib/firebase-admin';
import { requireUser } from '@/lib/auth';
import { handle, HttpError } from '@/lib/http';
import { grantWelcomeBonus, WELCOME_BONUS_POINTS } from '@/lib/points';

export async function POST(req: Request) {
  return handle(async () => {
    const { uid } = await requireUser(req);

    const record = await adminAuth.getUser(uid);
    if (!record.emailVerified) {
      throw new HttpError(403, 'Najprv potvrď svoj e-mail');
    }

    await grantWelcomeBonus(uid);
    return { ok: true, points: WELCOME_BONUS_POINTS };
  });
}
