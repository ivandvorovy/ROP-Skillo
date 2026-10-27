// lib/api-client.ts
// Funkcie pre prehliadač (volaj ich z tlačidiel a formulárov), ktoré hovoria
// s API routes. UI ich len zavolá a zobrazí chybu, ak niektorá vyhodí Error.

import {
  sendEmailVerification,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

// Spoločný POST s ID tokenom v hlavičke. Token sa pri každom volaní berie čerstvý,
// Firebase ho sám obnoví, keď expiroval.
export async function authedPost<T = unknown>(url: string, body?: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nie si prihlásený');

  const token = await user.getIdToken();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Požiadavka zlyhala');
  return data as T;
}

// Registrácia: server vytvorí účet (a skontroluje školskú doménu), potom sa
// prihlásime a Firebase pošle overovací e-mail.
export async function registerStudent(email: string, password: string, displayName: string): Promise<void> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Registrácia zlyhala');

  const cred = await signInWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(cred.user);
}

// Zavolaj, keď používateľ klikol na overovací odkaz a vrátil sa do appky
// (napr. tlačidlo "Už som potvrdil e-mail"). Server bonus pripíše len raz.
export async function claimWelcomeBonus(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nie si prihlásený');

  // reload() stiahne aktuálny stav účtu (emailVerified) z Firebase.
  await user.reload();
  if (!user.emailVerified) throw new Error('E-mail ešte nie je potvrdený');

  await authedPost('/api/auth/welcome-bonus');
}
