// lib/api-client.ts
// Funkcie pre prehliadač (volaj ich z tlačidiel a formulárov), ktoré hovoria
// s API routes. UI ich len zavolá a zobrazí chybu, ak niektorá vyhodí Error.

import {
  sendEmailVerification,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase-client';

// Chyba z API so stavovým kódom, aby UI vedelo rozlíšiť napr. 409 (už hotové)
// od 403 (e-mail nie je potvrdený). message je text zo servera, dá sa rovno zobraziť.
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function readError(res: Response, fallback: string): Promise<ApiError> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return new ApiError(res.status, data.error ?? fallback);
}

// Spoločný POST s ID tokenom v hlavičke. Token sa pri každom volaní berie čerstvý,
// Firebase ho sám obnoví, keď expiroval.
export async function authedPost<T = unknown>(url: string, body?: unknown): Promise<T> {
  const user = getClientAuth().currentUser;
  if (!user) throw new ApiError(401, 'Nie si prihlásený');

  const token = await user.getIdToken();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) throw await readError(res, 'Požiadavka zlyhala');
  return (await res.json().catch(() => ({}))) as T;
}

// Registrácia: server vytvorí účet (a skontroluje školskú doménu), potom sa
// prihlásime a Firebase pošle overovací e-mail.
export async function registerStudent(email: string, password: string, displayName: string): Promise<void> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });
  if (!res.ok) throw await readError(res, 'Registrácia zlyhala');

  const cred = await signInWithEmailAndPassword(getClientAuth(), email, password);
  await sendEmailVerification(cred.user);
}

// Zavolaj, keď používateľ klikol na overovací odkaz a vrátil sa do appky
// (napr. tlačidlo "Už som potvrdil e-mail"). Server bonus pripíše len raz,
// opakované volanie skončí ApiError so status 409.
export async function claimWelcomeBonus(): Promise<void> {
  const user = getClientAuth().currentUser;
  if (!user) throw new ApiError(401, 'Nie si prihlásený');

  // reload() stiahne aktuálny stav účtu (emailVerified) z Firebase.
  await user.reload();
  if (!user.emailVerified) throw new ApiError(403, 'E-mail ešte nie je potvrdený');

  await authedPost('/api/auth/welcome-bonus');
}
