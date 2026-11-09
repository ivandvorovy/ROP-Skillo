// lib/firebase-client.ts
// Firebase v prehliadači (Auth + Firestore na čítanie). Konfigurácia je verejná,
// nie je to tajomstvo; bezpečnosť zabezpečujú Firestore rules a overenie tokenu na serveri.
//
// Prečo funkcie a nie konštanty: Next.js pri builde vykreslí aj 'use client' stránky
// na serveri. Keby sa Firebase inicializoval pri importe, build bez NEXT_PUBLIC_*
// premenných by spadol (auth/invalid-api-key). Funkcie voláme len v prehliadači
// (v useEffect a v obsluhe tlačidiel), takže pri builde sa nič neinicializuje.

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

function getClientApp(): FirebaseApp {
  return (
    getApps()[0] ??
    initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    })
  );
}

export function getClientAuth(): Auth {
  return getAuth(getClientApp());
}

// Firestore v prehliadači smie len to, čo povolí firestore.rules:
// čítať vlastné dáta a meniť v profile displayName, bio, offeredSkillIds, wantedSkillIds.
export function getClientDb(): Firestore {
  return getFirestore(getClientApp());
}
