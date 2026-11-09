// lib/firebase-errors.ts
// Firebase Auth vracia chyby ako kódy v angličtine ("auth/invalid-credential").
// Tu ich prekladáme na vety, ktoré sa dajú ukázať používateľovi.

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Nesprávny e-mail alebo heslo.',
  'auth/wrong-password': 'Nesprávny e-mail alebo heslo.',
  'auth/user-not-found': 'Nesprávny e-mail alebo heslo.',
  'auth/invalid-email': 'Toto nie je platný e-mail.',
  'auth/user-disabled': 'Tento účet je zablokovaný.',
  'auth/too-many-requests': 'Príliš veľa pokusov. Skús to znova o pár minút.',
  'auth/network-request-failed': 'Nepodarilo sa spojiť so serverom. Skontroluj internet.',
};

export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];
  // Chyby z našich API (ApiError) majú už slovenskú správu zo servera.
  if (e instanceof Error && !code) return e.message;
  return 'Niečo sa pokazilo. Skús to znova.';
}
