'use client';

import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buttonClass } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { getClientAuth } from '@/lib/firebase-client';

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
      <span aria-hidden className="grid size-7 place-items-center rounded-md bg-pink text-sm text-ink">
        S
      </span>
      Skillo
    </span>
  );
}

export function SiteHeader() {
  const { user, loading } = useAuth();
  const router = useRouter();

  async function logout() {
    await signOut(getClientAuth());
    router.push('/login');
  }

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Skillo, domov">
          <Logo />
        </Link>

        {/* Kým sa nevie, či je niekto prihlásený, tlačidlá nezobrazujeme (inak by blikli). */}
        {!loading && (
          <nav className="flex items-center gap-2">
            {user ? (
              <>
                <Link href="/profile" className={buttonClass('ghost', 'h-10 px-3 text-sm')}>
                  Môj profil
                </Link>
                <button onClick={logout} className={buttonClass('secondary', 'h-10 px-4 text-sm')}>
                  Odhlásiť
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={buttonClass('secondary', 'h-10 px-4 text-sm')}>
                  Prihlásiť
                </Link>
                <Link href="/register" className={buttonClass('primary', 'hidden h-10 px-4 text-sm sm:inline-flex')}>
                  Registrovať
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
