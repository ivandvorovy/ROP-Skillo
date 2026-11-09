'use client';

import { signInWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, linkClass } from '@/components/ui';
import { getClientAuth } from '@/lib/firebase-client';
import { authErrorMessage } from '@/lib/firebase-errors';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    setError(null);
    setSubmitting(true);
    try {
      const cred = await signInWithEmailAndPassword(getClientAuth(), email, password);
      // Kto ešte nepotvrdil e-mail, ide najprv tam (bez toho nedostane uvítací bonus).
      router.push(cred.user.emailVerified ? '/profile' : '/verify-email');
    } catch (err) {
      setError(authErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight">Prihlásenie</h1>
      <p className="mt-3 text-muted">Vitaj späť.</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <Field label="Školský e-mail" name="email" type="email" autoComplete="email" inputMode="email" required />
        <Field label="Heslo" name="password" type="password" autoComplete="current-password" required />

        {error && <Alert tone="error">{error}</Alert>}

        <Button type="submit" loading={submitting} className="mt-2">
          Prihlásiť sa
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Nemáš účet?{' '}
        <Link href="/register" className={linkClass}>
          Zaregistruj sa
        </Link>
      </p>
    </>
  );
}
