'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Alert, linkClass, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { useSkills, useUserProfile } from '@/lib/profile-data';
import { AboutCard } from './_components/about-card';
import { HistoryCard } from './_components/history-card';
import { PointsCard } from './_components/points-card';
import { SkillsCard } from './_components/skills-card';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const profile = useUserProfile(user?.uid);
  const skills = useSkills();

  // Neprihlásený ide na prihlásenie, neoverený na overenie e-mailu.
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/login');
    else if (!user.emailVerified) router.replace('/verify-email');
  }, [authLoading, user, router]);

  if (authLoading || !user || !user.emailVerified || profile.loading) {
    return (
      <main className="flex justify-center py-24 text-muted">
        <Spinner className="size-6" />
      </main>
    );
  }

  if (profile.error || !profile.data) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <Alert tone="error">{profile.error ?? 'Profil sa nenašiel.'}</Alert>
      </main>
    );
  }

  const p = profile.data;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Overený e-mail, ale bonus ešte nevyzdvihnutý (napr. zavrel okno skôr). */}
      {!p.welcomeBonusGranted && (
        <div className="mb-6">
          <Alert tone="info">
            Uvítací bonus 35 bodov ešte čaká.{' '}
            <Link href="/verify-email" className={linkClass}>
              Vyzdvihnúť
            </Link>
          </Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <AboutCard uid={user.uid} email={user.email} displayName={p.displayName} bio={p.bio} />
          {skills.error && <Alert tone="error">{skills.error}</Alert>}
          <SkillsCard
            uid={user.uid}
            field="offeredSkillIds"
            title="Ponúkam"
            emptyText="Vyber, v čom vieš pomôcť ostatným. Za lekcie dostaneš body."
            selectedIds={p.offeredSkillIds}
            skills={skills.data}
            skillsLoading={skills.loading}
            tone="pink"
          />
          <SkillsCard
            uid={user.uid}
            field="wantedSkillIds"
            title="Hľadám"
            emptyText="Vyber, s čím potrebuješ pomôcť. Podľa toho ti nájdeme lektorov."
            selectedIds={p.wantedSkillIds}
            skills={skills.data}
            skillsLoading={skills.loading}
            tone="neutral"
          />
        </div>

        <aside className="order-first flex flex-col gap-6 lg:sticky lg:top-6 lg:order-none lg:self-start">
          <PointsCard balance={p.pointsBalance} held={p.pointsHeld} />
        </aside>

        <div className="min-w-0 lg:col-span-2">
          <h2 className="mb-4 font-display text-2xl font-extrabold tracking-tight">História</h2>
          <HistoryCard uid={user.uid} skills={skills.data} />
        </div>
      </div>
    </main>
  );
}
