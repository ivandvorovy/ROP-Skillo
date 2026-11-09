// scripts/seed-skills.ts
// Naplní kolekciu `skills` základným zoznamom zručností, aby sa dali otestovať
// sekcie "Ponúkam" a "Hľadám" v profile.
//
// DOČASNÉ: finálny zoznam kategórií je Filipova karta "Kategórie zručností".
// Keď bude hotový, tento súbor sa nahradí alebo upraví.
//
// Spustenie (potrebuje vyplnený .env.local):  npm run seed:skills
// Skript sa dá spustiť opakovane: existujúce zručnosti preskočí, nič neprepíše.

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

// ID = slug, aby opakované spustenie nevytváralo duplicity.
const SKILLS: { id: string; name: string; category: string }[] = [
  { id: 'matematika', name: 'Matematika', category: 'Prírodné vedy' },
  { id: 'fyzika', name: 'Fyzika', category: 'Prírodné vedy' },
  { id: 'chemia', name: 'Chémia', category: 'Prírodné vedy' },
  { id: 'biologia', name: 'Biológia', category: 'Prírodné vedy' },
  { id: 'python', name: 'Python', category: 'Programovanie' },
  { id: 'javascript', name: 'JavaScript', category: 'Programovanie' },
  { id: 'java', name: 'Java', category: 'Programovanie' },
  { id: 'anglictina', name: 'Angličtina', category: 'Jazyky' },
  { id: 'nemcina', name: 'Nemčina', category: 'Jazyky' },
  { id: 'slovencina', name: 'Slovenčina', category: 'Jazyky' },
  { id: 'dejepis', name: 'Dejepis', category: 'Humanitné predmety' },
  { id: 'grafika', name: 'Grafický dizajn', category: 'Kreatívne' },
  { id: 'gitara', name: 'Gitara', category: 'Kreatívne' },
];

async function main() {
  let created = 0;
  for (const skill of SKILLS) {
    const ref = adminDb.collection('skills').doc(skill.id);
    const snap = await ref.get();
    if (snap.exists) continue;

    await ref.set({
      name: skill.name,
      category: skill.category,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
    });
    created++;
  }
  console.log(`Hotovo: ${created} nových, ${SKILLS.length - created} už existovalo.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
