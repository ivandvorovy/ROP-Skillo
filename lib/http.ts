// lib/http.ts
// Spoločné pomôcky pre API routes: vlastná chyba s HTTP kódom a wrapper,
// ktorý z každej vyhodenej chyby urobí správnu JSON odpoveď.

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Obalí logiku route handlera:
// - ak vráti hodnotu, pošle ju ako JSON so stavom successStatus,
// - ak vyhodí HttpError, pošle jeho správu a kód (napr. 402 "Nedostatok bodov"),
// - akúkoľvek inú chybu zaloguje a klientovi pošle len všeobecné 500
//   (interné detaily sa klientovi nikdy neposielajú).
export async function handle(
  fn: () => Promise<unknown>,
  successStatus = 200,
): Promise<Response> {
  try {
    const data = await fn();
    return Response.json(data ?? { ok: true }, { status: successStatus });
  } catch (e) {
    if (e instanceof HttpError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return Response.json({ error: 'Interná chyba servera' }, { status: 500 });
  }
}
