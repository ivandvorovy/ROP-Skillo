// Slovenské popisy stavov a typov pre profil.

import type { LessonStatus, PointsTxType } from '@/lib/profile-data';

export const LESSON_STATUS: Record<LessonStatus, { label: string; tone: 'neutral' | 'brand' | 'points' | 'danger' }> = {
  requested: { label: 'Čaká na potvrdenie', tone: 'points' },
  confirmed: { label: 'Potvrdená', tone: 'brand' },
  completed: { label: 'Prebehla', tone: 'neutral' },
  cancelled: { label: 'Zrušená', tone: 'neutral' },
  disputed: { label: 'V riešení', tone: 'danger' },
  no_show_student: { label: 'Študent neprišiel', tone: 'danger' },
  no_show_tutor: { label: 'Lektor neprišiel', tone: 'danger' },
};

export const TX_TYPE: Record<PointsTxType, string> = {
  signup_bonus: 'Uvítací bonus',
  lesson_hold: 'Zablokované za lekciu',
  lesson_earned: 'Odmena za lekciu',
  lesson_refund: 'Vrátené za lekciu',
  document_purchase: 'Nákup materiálu',
  document_sale: 'Predaj materiálu',
};

const dateFmt = new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('sk-SK', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatDate = (d: Date) => dateFmt.format(d);
export const formatDateTime = (d: Date) => dateTimeFmt.format(d);
