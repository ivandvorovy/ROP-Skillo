import Link from 'next/link';
import { ArrowRight, buttonClass, linkClass } from '@/components/ui';

// Ukážkové karty v hero (namiesto fotiek lektorov). Ceny zodpovedajú vzorcu
// calculateLessonPrice v lib/points.ts: 60 min ľahká = 8 b, 45 min stredná = 9 b, 30 min ťažká = 8 b.
const SAMPLE_TUTORS = [
  { initials: 'EK', name: 'Ema K.', klass: '3.B', skill: 'Matematika', detail: '60 min · 8 bodov', tone: 'bg-pink-soft' },
  { initials: 'TM', name: 'Tomáš M.', klass: '4.A', skill: 'Python', detail: '45 min · 9 bodov', tone: 'bg-subtle' },
  { initials: 'SL', name: 'Sára L.', klass: '2.C', skill: 'Nemčina', detail: '30 min · 8 bodov', tone: 'bg-success-soft' },
];

// Len fakty, ktoré platia v kóde (žiadne vymyslené počty používateľov).
const FACTS = [
  { value: '35', label: 'bodov na štart po overení školského e-mailu' },
  { value: '0 €', label: 'platí sa len bodmi, tie sa nedajú kúpiť' },
  { value: '15–240', label: 'minút môže trvať jedna lekcia' },
  { value: '2×', label: 'potvrdenie: body sa pripíšu, až keď lekcia naozaj prebehla' },
];

const STEPS = [
  { title: 'Vyplň, čo ponúkaš a čo hľadáš', text: 'V profile si vyber predmety, v ktorých vieš pomôcť, a tie, s ktorými potrebuješ pomoc.' },
  { title: 'Rezervuj si lekciu za body', text: 'Body sa pri rezervácii len zablokujú. Ak lekciu zrušíš, vrátia sa ti.' },
  { title: 'Uč a zarábaj', text: 'Za každú odučenú lekciu dostaneš body, ktoré minieš na vlastné učenie.' },
];

export default function HomePage() {
  return (
    <main>
      {/* Hero: plný ružový blok */}
      <section className="bg-pink">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Nauč sa to od spolužiaka.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed">
              Skillo spája študentov tvojej školy. Hodinu matiky vymeníš za hodinu angličtiny a platíš bodmi, nie
              peniazmi.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link href="/register" className={buttonClass('primary', 'px-6')}>
                Vytvoriť účet
                <ArrowRight />
              </Link>
              <Link href="/login" className={linkClass}>
                Už mám účet
              </Link>
            </div>
          </div>

          {/* Poskladané karty lektorov (ukážka, ako vyzerá ponuka v appke) */}
          <div aria-hidden className="relative mx-auto h-[300px] w-full max-w-sm sm:h-[340px]">
            {SAMPLE_TUTORS.map((t, i) => (
              <div
                key={t.name}
                className="absolute w-[85%] rounded-card bg-surface p-5 shadow-[0_12px_32px_-12px_rgba(18,17,23,0.35)]"
                style={{ top: `${i * 30}%`, left: i % 2 === 0 ? '0%' : '15%', zIndex: i + 1 }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-full font-display font-extrabold ${t.tone}`}
                  >
                    {t.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {t.name} <span className="font-normal text-muted">· {t.klass}</span>
                    </p>
                    <p className="text-sm text-muted">Učí: {t.skill}</p>
                  </div>
                </div>
                <p className="mt-4 border-t border-line pt-3 text-sm font-semibold tabular-nums">{t.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pás s faktami */}
      <section className="border-b border-line">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.value} className="pr-6">
              <dt className="sr-only">{f.label}</dt>
              <dd>
                <span className="block font-display text-3xl font-extrabold tracking-tight tabular-nums">{f.value}</span>
                <span className="mt-1 block text-sm text-muted">{f.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Ako to funguje */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <h2 className="max-w-xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
          Ako funguje Skillo
        </h2>
        <ol className="mt-12 grid gap-10 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="border-t-2 border-ink pt-5">
              <span className="font-display text-sm font-extrabold tabular-nums">0{i + 1}</span>
              <h3 className="mt-3 font-display text-xl font-bold tracking-tight">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
        <Link href="/register" className={buttonClass('primary', 'mt-12 px-6')}>
          Začať zadarmo
          <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
