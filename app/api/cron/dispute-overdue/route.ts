// app/api/cron/dispute-overdue/route.ts
// GET /api/cron/dispute-overdue
//
// Volá ju plánovač Vercel Cron (nastavenie je vo vercel.json), nie používateľ.
// Lekcie, ktoré obe strany nepotvrdili do DISPUTE_AFTER_HOURS od skončenia,
// presunie do stavu 'disputed'; potom o nich rozhodne admin.
//
// ZABEZPEČENIE: route je verejná URL, preto ju chráni tajný reťazec CRON_SECRET.
// Vercel ho pri cron volaní sám pošle v hlavičke "Authorization: Bearer <CRON_SECRET>".
// Bez neho by hocikto mohol spúšťať spracovanie sporov.

import { handle, HttpError } from '@/lib/http';
import { markOverdueLessonsDisputed } from '@/lib/points';

export async function GET(req: Request) {
  return handle(async () => {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new Error('Chýba CRON_SECRET');

    if (req.headers.get('authorization') !== `Bearer ${secret}`) {
      throw new HttpError(401, 'Neplatný cron kľúč');
    }

    return markOverdueLessonsDisputed();
  });
}
