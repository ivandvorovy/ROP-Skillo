'use client';

import { sendEmailVerification } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, Button, buttonClass, PointsBadge, Spinner } from '@/components/ui';
import { ApiError, claimWelcomeBonus } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { authErrorMessage } from '@/lib/firebase-errors';

// Ako dlho sa nedá znova poslať e-mail (Firebase inak vráti too-many-requests).
const RESEND_COOLDOWN_S = 60;

export default function VerifyEmailPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onClaim() {
    setError(null);
    setInfo(null);
    setClaiming(true);
    try {
      await claimWelcomeBonus();
      refresh(); // emailVerified sa zmenilo, nech to vidí aj zvyšok appky
      setClaimed(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Bonus už bol pripísaný skôr (napr. v inej karte). Nie je to chyba.
        router.push('/profile');
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setError('E-mail ešte nie je potvrdený. Otvor odkaz z e-mailu a skús to znova.');
      } else {
        setError(authErrorMessage(err));
      }
    } finally {
      setClaiming(false);
    }
  }

  async function onResend() {
    if (!user) return;
    setError(null);
    setInfo(null);
    try {
      await sendEmailVerification(user);
      setInfo('Poslali sme nový overovací e-mail.');
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8 text-muted">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight">Overenie e-mailu</h1>
        <p className="mt-2 text-muted">Najprv sa prihlás.</p>
        <Link href="/login" className={buttonClass('primary', 'mt-6 w-full')}>
          Prihlásiť sa
        </Link>
      </>
    );
  }

  if (claimed) {
    return (
      <div>
        <PointsBadge value={35} className="text-2xl" />
        <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight">Účet je overený</h1>
        <p className="mt-3 text-muted">Body máš na účte. Môžeš si vyplniť profil a rezervovať prvú lekciu.</p>
        <Link href="/profile" className={buttonClass('primary', 'mt-6 w-full')}>
          Pokračovať na profil
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight">Potvrď svoj e-mail</h1>
      <p className="mt-3 text-muted">
        Poslali sme odkaz na <span className="font-semibold text-ink">{user.email}</span>. Klikni naň a potom sa vráť
        sem.
      </p>

      <div className="mt-6 flex items-center gap-4 rounded-card bg-pink-soft p-4">
        <span className="font-display text-3xl font-extrabold tabular-nums">35</span>
        <p className="text-sm">bodov ti pripíšeme hneď po potvrdení e-mailu, na prvé lekcie.</p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {error && <Alert tone="error">{error}</Alert>}
        {info && <Alert tone="success">{info}</Alert>}

        <Button onClick={onClaim} loading={claiming}>
          E-mail mám potvrdený
        </Button>
        <Button variant="secondary" onClick={onResend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Poslať znova o ${cooldown} s` : 'Poslať e-mail znova'}
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-muted">Nevidíš e-mail? Pozri priečinok Spam alebo Promo akcie.</p>
    </>
  );
}
