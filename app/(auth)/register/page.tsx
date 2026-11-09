'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, linkClass } from '@/components/ui';
import { registerStudent } from '@/lib/api-client';
import { authErrorMessage } from '@/lib/firebase-errors';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const displayName = String(form.get('displayName') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    setError(null);
    setSubmitting(true);
    try {
      // Doménu školy kontroluje server, chybu (napr. "len školským e-mailom") len zobrazíme.
      await registerStudent(email, password, displayName);
      router.push('/verify-email');
    } catch (err) {
      setError(authErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight">Vytvor si účet</h1>
      <p className="mt-3 text-muted">Registrovať sa dá len školským e-mailom.</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <Field
          label="Meno"
          name="displayName"
          autoComplete="name"
          required
          minLength={2}
          maxLength={60}
          placeholder="Napr. Jana Nováková"
        />
        <Field
          label="Školský e-mail"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="meno@skola.sk"
        />
        <Field
          label="Heslo"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="Aspoň 8 znakov."
        />

        {error && <Alert tone="error">{error}</Alert>}

        <Button type="submit" loading={submitting} className="mt-2">
          Registrovať sa
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Už máš účet?{' '}
        <Link href="/login" className={linkClass}>
          Prihlás sa
        </Link>
      </p>
    </>
  );
}
