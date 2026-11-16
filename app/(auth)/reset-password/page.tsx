'use client';

import { sendPasswordResetEmail } from 'firebase/auth';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Alert, Button, buttonClass, Field, linkClass } from '@/components/ui';
import { getClientAuth } from '@/lib/firebase-client';
import { authErrorMessage } from '@/lib/firebase-errors';

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim();

    setError(null);
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(getClientAuth(), email);
      setSentTo(email);
    } catch (err) {
      // Neznámy e-mail neprezradíme (inak by sa dalo zisťovať, kto má účet),
      // tvárime sa rovnako ako pri úspechu.
      if ((err as { code?: string })?.code === 'auth/user-not-found') setSentTo(email);
      else setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <>
        <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight">Pozri si e-mail</h1>
        <p className="mt-3 text-muted">
          Ak k adrese <span className="font-semibold text-ink">{sentTo}</span> existuje účet, poslali sme na ňu odkaz na
          nastavenie nového hesla.
        </p>
        <Link href="/login" className={buttonClass('primary', 'mt-6 w-full')}>
          Späť na prihlásenie
        </Link>
        <p className="mt-6 text-center text-xs text-muted">Nevidíš e-mail? Pozri priečinok Spam alebo Promo akcie.</p>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight">Zabudnuté heslo</h1>
      <p className="mt-3 text-muted">Zadaj svoj školský e-mail a pošleme ti odkaz na nastavenie nového hesla.</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <Field label="Školský e-mail" name="email" type="email" autoComplete="email" inputMode="email" required />

        {error && <Alert tone="error">{error}</Alert>}

        <Button type="submit" loading={submitting} className="mt-2">
          Poslať odkaz
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Spomenul si si?{' '}
        <Link href="/login" className={linkClass}>
          Prihlás sa
        </Link>
      </p>
    </>
  );
}
