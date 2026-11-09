import type { ReactNode } from 'react';

// Spoločný rámec pre registráciu, prihlásenie a overenie e-mailu.
// Desktop: ružový panel vľavo, formulár vpravo. Mobil: len formulár pod tenkým ružovým pásom.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-pink p-12 lg:flex">
        <p className="max-w-md font-display text-5xl font-extrabold leading-[1.04] tracking-tight">
          Uč, čo vieš. Nauč sa, čo potrebuješ.
        </p>
        <p className="max-w-sm text-lg">Výmena zručností medzi študentmi tvojej školy. Bez peňazí, len za body.</p>
      </aside>

      <div className="border-t-8 border-pink lg:border-t-0">
        <div className="mx-auto flex w-full max-w-md flex-col px-4 py-12 sm:py-20">{children}</div>
      </div>
    </main>
  );
}
