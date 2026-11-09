'use client';

// lib/profile-data.ts
// Čítanie dát pre profil priamo z Firestore v prehliadači (cez klientske SDK).
// Smie len to, čo dovolí firestore.rules:
//  - users/*        číta každý prihlásený, meniť smie len vlastné displayName, bio, offeredSkillIds, wantedSkillIds,
//  - skills/*       číta každý prihlásený,
//  - lessons        len vlastné (dotaz MUSÍ filtrovať studentId alebo tutorId == moje uid),
//  - points_transactions  len vlastné (filter userId == moje uid).
// Body sa tu NIKDY nezapisujú, to robí len server (lib/points.ts).

import {
  collection,
  doc,
  documentId,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { getClientDb } from '@/lib/firebase-client';

// ---------------------------------------------------------------------------
// Typy (zodpovedajú docs/firestore-schema.md)
// ---------------------------------------------------------------------------

export interface UserProfile {
  displayName: string;
  bio: string;
  offeredSkillIds: string[];
  wantedSkillIds: string[];
  pointsBalance: number;
  pointsHeld: number;
  welcomeBonusGranted: boolean;
  ratingAvg?: number;
  ratingCount?: number;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
}

export type LessonStatus =
  | 'requested'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'no_show_student'
  | 'no_show_tutor';

export interface LessonItem {
  id: string;
  skillId: string;
  tutorId: string;
  studentId: string;
  startsAt: Date;
  durationMin: number;
  pricePoints: number;
  status: LessonStatus;
  role: 'student' | 'tutor'; // aká je moja rola v lekcii
}

export type PointsTxType =
  | 'signup_bonus'
  | 'lesson_hold'
  | 'lesson_earned'
  | 'lesson_refund'
  | 'document_purchase'
  | 'document_sale';

export interface PointsTxItem {
  id: string;
  amount: number;
  type: PointsTxType;
  createdAt: Date | null; // null na okamih, kým server nedoplní serverTimestamp
}

// Koľko položiek histórie sa načíta. Stránkovanie zatiaľ netreba.
const HISTORY_LIMIT = 20;

interface Loadable<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Profil (živý: body sa prekreslia hneď, ako ich server zmení)
// ---------------------------------------------------------------------------

export function useUserProfile(uid: string | undefined): Loadable<UserProfile | null> {
  const [state, setState] = useState<Loadable<UserProfile | null>>({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(getClientDb(), 'users', uid),
      (snap) =>
        setState({
          data: snap.exists() ? (snap.data() as UserProfile) : null,
          loading: false,
          error: snap.exists() ? null : 'Profil sa nenašiel.',
        }),
      () => setState({ data: null, loading: false, error: 'Profil sa nepodarilo načítať.' }),
    );
  }, [uid]);

  return state;
}

// Uloží len polia, ktoré rules dovolia meniť. Ostatné (body, rola) by rules zamietli.
export async function updateMyProfile(
  uid: string,
  patch: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'offeredSkillIds' | 'wantedSkillIds'>>,
): Promise<void> {
  await updateDoc(doc(getClientDb(), 'users', uid), patch);
}

// ---------------------------------------------------------------------------
// Zručnosti
// ---------------------------------------------------------------------------

export function useSkills(): Loadable<Skill[]> {
  const [state, setState] = useState<Loadable<Skill[]>>({ data: [], loading: true, error: null });

  useEffect(() => {
    getDocs(query(collection(getClientDb(), 'skills'), where('status', '==', 'active')))
      .then((snap) => {
        const skills = snap.docs
          .map((d) => ({ id: d.id, name: d.get('name') as string, category: d.get('category') as string }))
          .sort((a, b) => a.category.localeCompare(b.category, 'sk') || a.name.localeCompare(b.name, 'sk'));
        setState({ data: skills, loading: false, error: null });
      })
      .catch(() => setState({ data: [], loading: false, error: 'Zručnosti sa nepodarilo načítať.' }));
  }, []);

  return state;
}

// ---------------------------------------------------------------------------
// História lekcií: spojí lekcie, kde som študent, a kde som lektor
// ---------------------------------------------------------------------------

export function useLessonHistory(uid: string | undefined): Loadable<LessonItem[]> {
  const [state, setState] = useState<Loadable<LessonItem[]>>({ data: [], loading: true, error: null });

  useEffect(() => {
    if (!uid) return;
    const lessons = collection(getClientDb(), 'lessons');

    // Dva dotazy, lebo Firestore nevie "studentId == uid OR tutorId == uid" tak,
    // aby to rules prijali. Indexy sú vo firestore.indexes.json.
    const load = (field: 'studentId' | 'tutorId', role: LessonItem['role']) =>
      getDocs(query(lessons, where(field, '==', uid), orderBy('startsAt', 'desc'), limit(HISTORY_LIMIT))).then(
        (snap) =>
          snap.docs.map((d): LessonItem => {
            const v = d.data();
            return {
              id: d.id,
              skillId: v.skillId,
              tutorId: v.tutorId,
              studentId: v.studentId,
              startsAt: (v.startsAt as Timestamp).toDate(),
              durationMin: v.durationMin,
              pricePoints: v.pricePoints,
              status: v.status,
              role,
            };
          }),
      );

    Promise.all([load('studentId', 'student'), load('tutorId', 'tutor')])
      .then(([asStudent, asTutor]) => {
        const all = [...asStudent, ...asTutor]
          .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
          .slice(0, HISTORY_LIMIT);
        setState({ data: all, loading: false, error: null });
      })
      .catch(() => setState({ data: [], loading: false, error: 'Históriu lekcií sa nepodarilo načítať.' }));
  }, [uid]);

  return state;
}

// ---------------------------------------------------------------------------
// História bodov (živá, aby sa bonus ukázal hneď po pripísaní)
// ---------------------------------------------------------------------------

export function usePointsHistory(uid: string | undefined): Loadable<PointsTxItem[]> {
  const [state, setState] = useState<Loadable<PointsTxItem[]>>({ data: [], loading: true, error: null });

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(getClientDb(), 'points_transactions'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(HISTORY_LIMIT),
    );
    return onSnapshot(
      q,
      (snap) =>
        setState({
          data: snap.docs.map((d) => {
            const v = d.data({ serverTimestamps: 'estimate' });
            return {
              id: d.id,
              amount: v.amount,
              type: v.type,
              createdAt: v.createdAt ? (v.createdAt as Timestamp).toDate() : null,
            };
          }),
          loading: false,
          error: null,
        }),
      () => setState({ data: [], loading: false, error: 'Históriu bodov sa nepodarilo načítať.' }),
    );
  }, [uid]);

  return state;
}

// ---------------------------------------------------------------------------
// Mená ľudí (druhá strana lekcie)
// ---------------------------------------------------------------------------

export function useUserNames(uids: string[]): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = [...new Set(uids)].sort().join(',');

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (ids.length === 0) return;

    // Firestore "in" berie najviac 30 hodnôt naraz.
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));

    Promise.all(
      chunks.map((chunk) =>
        getDocs(query(collection(getClientDb(), 'users'), where(documentId(), 'in', chunk))),
      ),
    )
      .then((snaps) => {
        const result: Record<string, string> = {};
        for (const snap of snaps) for (const d of snap.docs) result[d.id] = d.get('displayName');
        setNames(result);
      })
      .catch(() => {
        // Mená nie sú kritické, história sa zobrazí aj bez nich.
      });
  }, [key]);

  return names;
}
