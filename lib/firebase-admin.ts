// lib/firebase-admin.ts
// Inicializácia Firebase Admin SDK. Používa sa LEN na serveri (API routes).
// Admin SDK obchádza Firestore security rules, preto tu žije všetko, čo
// klient robiť nesmie (zmena bodov, vytvorenie lekcie, nákup dokumentu).

import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp(): App {
  // V Next.js dev režime sa modul načítava opakovane; bez tejto kontroly by
  // initializeApp padol na "app already exists".
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // V env premennej sú riadky oddelené textom "\n", treba ich vrátiť na reálne nové riadky.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Chýbajú FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

// Lenivá inicializácia: Admin SDK sa vytvorí až pri prvom použití (prvé volanie API),
// nie pri importe modulu. `next build` totiž importuje všetky routes, a keby sa
// inicializovalo hneď, build bez env premenných (napr. na CI) by spadol.
// Volajúci kód sa nemení: adminDb.collection(...), adminAuth.verifyIdToken(...).
function lazy<T extends object>(create: () => T): T {
  let instance: T | undefined;
  return new Proxy({} as T, {
    get(_target, prop) {
      instance ??= create();
      const value = Reflect.get(instance, prop, instance);
      // Metódy SDK používajú `this`, preto ich viažeme na skutočnú inštanciu.
      return typeof value === 'function' ? value.bind(instance) : value;
    },
  });
}

export const adminAuth = lazy(() => getAuth(getAdminApp()));
export const adminDb = lazy(() => getFirestore(getAdminApp()));
