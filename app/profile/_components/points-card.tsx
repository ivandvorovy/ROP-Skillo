// Zostatok bodov. Ružová plocha = najdôležitejšie číslo na profile.
// pointsHeld = body zablokované za lekcie, ktoré ešte neprebehli.
export function PointsCard({ balance, held }: { balance: number; held: number }) {
  return (
    <section className="rounded-card bg-pink p-6">
      <p className="text-sm font-semibold">Dostupné body</p>
      <p className="mt-1 font-display text-6xl font-extrabold leading-none tracking-tight tabular-nums">{balance}</p>

      <dl className="mt-6 flex items-baseline justify-between border-t-2 border-ink/15 pt-4 text-sm">
        <dt>Zablokované za lekcie</dt>
        <dd className="font-display text-lg font-extrabold tabular-nums">{held}</dd>
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-ink/75">
        Body sa pri rezervácii zablokujú. Lektor ich dostane, až keď obaja potvrdíte, že lekcia prebehla.
      </p>
    </section>
  );
}
