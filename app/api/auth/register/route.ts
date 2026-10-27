// app/api/auth/register/route.ts
// POST /api/auth/register   telo: { email, password, displayName }
//
// Registrácia ide cez server, nie priamo z prehliadača, z dvoch dôvodov:
//  1) server vynúti školskú doménu e-mailu (klientska kontrola sa dá obísť),
//  2) server vytvorí profil s presne správnymi začiatočnými hodnotami (0 bodov).
//
// DÔLEŽITÉ: aby sa školská doména nedala obísť priamym volaním Firebase Auth API,
// vypni vo Firebase konzole Authentication > Settings > User actions > "Enable create (sign-up)".
// Admin SDK (createUser nižšie) tým nie je dotknuté. [Over si, že tvoj projekt túto možnosť ponúka.]
//
// Overenie e-mailu (sendEmailVerification) robí klient po prihlásení,
// lebo Admin SDK vie e-maily len vygenerovať, nie odoslať.

import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { HttpError, handle } from '@/lib/http';

export async function POST(req: Request) {
  return handle(async () => {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new HttpError(400, 'Neplatné telo požiadavky');

    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const displayName = String(body.displayName ?? '').trim();

    // Doména sa berie z env, aby sa dala zmeniť bez zásahu do kódu.
    const domain = process.env.SCHOOL_EMAIL_DOMAIN?.trim().toLowerCase();
    if (!domain) throw new Error('Chýba SCHOOL_EMAIL_DOMAIN');

    if (!email.endsWith(`@${domain}`)) {
      throw new HttpError(400, `Registrovať sa môžeš len školským e-mailom (@${domain})`);
    }
    if (displayName.length < 2 || displayName.length > 60) {
      throw new HttpError(400, 'Meno musí mať 2 až 60 znakov');
    }
    if (password.length < 8) throw new HttpError(400, 'Heslo musí mať aspoň 8 znakov');

    // 1. Účet v Firebase Auth.
    let uid: string;
    try {
      const user = await adminAuth.createUser({ email, password, displayName, emailVerified: false });
      uid = user.uid;
    } catch (e) {
      if ((e as { code?: string }).code === 'auth/email-already-exists') {
        throw new HttpError(409, 'Tento e-mail je už zaregistrovaný');
      }
      throw e;
    }

    // 2. Profil vo Firestore. Hodnoty zodpovedajú firestore.rules (0 bodov, role 'user').
    //    Ak zápis zlyhá, účet z kroku 1 zmažeme, aby nezostal účet bez profilu.
    try {
      await adminDb.collection('users').doc(uid).set({
        displayName,
        bio: '',
        role: 'user',
        offeredSkillIds: [], // sekcia "Ponúkam"
        wantedSkillIds: [], // sekcia "Hľadám"
        pointsBalance: 0, // bonus 35 bodov príde až po overení e-mailu
        pointsHeld: 0,
        welcomeBonusGranted: false,
        ratingAvg: 0,
        ratingCount: 0,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (e) {
      await adminAuth.deleteUser(uid);
      throw e;
    }

    return { uid };
  }, 201);
}
