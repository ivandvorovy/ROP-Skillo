'use client';

import { useState } from 'react';
import { Alert, Card, Spinner, cx } from '@/components/ui';
import {
  useLessonHistory,
  usePointsHistory,
  useUserNames,
  type LessonItem,
  type PointsTxItem,
  type Skill,
} from '@/lib/profile-data';
import { formatDate, formatDateTime, LESSON_STATUS, TX_TYPE } from './labels';

type Tab = 'lessons' | 'points';

export function HistoryCard({ uid, skills }: { uid: string; skills: Skill[] }) {
  const [tab, setTab] = useState<Tab>('lessons');
  // Lekcie načítame raz pre obe záložky: záložka Body z nich berie názov lekcie.
  const lessons = useLessonHistory(uid);
  const skillName = (id: string) => skills.find((s) => s.id === id)?.name ?? 'Lekcia';

  return (
    <Card className="p-0">
      <div role="tablist" aria-label="História" className="flex gap-1 border-b border-line px-4 pt-3">
        <TabButton active={tab === 'lessons'} onClick={() => setTab('lessons')}>
          Lekcie
        </TabButton>
        <TabButton active={tab === 'points'} onClick={() => setTab('points')}>
          Body
        </TabButton>
      </div>
      <div className="p-4 sm:p-6" role="tabpanel">
        {tab === 'lessons' ? (
          <LessonList lessons={lessons} skillName={skillName} />
        ) : (
          <PointsList uid={uid} lessons={lessons.data} skillName={skillName} />
        )}
      </div>
    </Card>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cx(
        '-mb-px border-b-[3px] px-3 pb-3 text-[15px] font-semibold transition-colors',
        active ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------

interface LessonListProps {
  lessons: { data: LessonItem[]; loading: boolean; error: string | null };
  skillName: (skillId: string) => string;
}

function LessonList({ lessons, skillName }: LessonListProps) {
  const { data, loading, error } = lessons;
  const names = useUserNames(data.map((l) => (l.role === 'student' ? l.tutorId : l.studentId)));

  if (loading) return <Loading />;
  if (error) return <Alert tone="error">{error}</Alert>;
  if (data.length === 0) {
    return <Empty>Zatiaľ žiadne lekcie. Keď si niekoho rezervuješ alebo niekto teba, objaví sa to tu.</Empty>;
  }

  return (
    <ul className="divide-y divide-line">
      {data.map((l) => (
        <LessonRow
          key={`${l.role}-${l.id}`}
          lesson={l}
          skill={skillName(l.skillId)}
          other={names[l.role === 'student' ? l.tutorId : l.studentId]}
        />
      ))}
    </ul>
  );
}

const STATUS_TONES = {
  neutral: 'bg-subtle text-muted',
  brand: 'bg-success-soft text-success',
  points: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

function LessonRow({ lesson, skill, other }: { lesson: LessonItem; skill: string; other?: string }) {
  const status = LESSON_STATUS[lesson.status];
  const isTutor = lesson.role === 'tutor';
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
      <div className="min-w-0">
        <p className="font-semibold">{skill}</p>
        <p className="text-sm text-muted">
          {isTutor ? 'Učíš' : 'Učí ťa'} {other ?? '…'} · {formatDateTime(lesson.startsAt)} · {lesson.durationMin} min
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className={cx('rounded-md px-2 py-0.5 text-xs font-semibold', STATUS_TONES[status.tone])}>
          {status.label}
        </span>
        {lesson.status === 'cancelled' ? (
          // Zrušená lekcia: body sa vrátili, cenu len prečiarkneme.
          <span className="w-14 text-right tabular-nums text-muted line-through">{lesson.pricePoints} b</span>
        ) : (
          <span className={cx('w-14 text-right font-semibold tabular-nums', isTutor ? 'text-success' : 'text-ink')}>
            {isTutor ? '+' : '−'}
            {lesson.pricePoints} b
          </span>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------

interface PointsListProps {
  uid: string;
  lessons: LessonItem[];
  skillName: (skillId: string) => string;
}

function PointsList({ uid, lessons, skillName }: PointsListProps) {
  const { data, loading, error } = usePointsHistory(uid);

  // Názov lekcie k transakcii. História lekcií má len posledných 20, pri staršej
  // lekcii sa zobrazí iba typ pohybu bez názvu.
  const lessonLabel = (lessonId: string | null) => {
    const lesson = lessonId ? lessons.find((l) => l.id === lessonId) : undefined;
    return lesson ? skillName(lesson.skillId) : null;
  };

  if (loading) return <Loading />;
  if (error) return <Alert tone="error">{error}</Alert>;
  if (data.length === 0) return <Empty>Zatiaľ žiadne pohyby bodov.</Empty>;

  return (
    <ul className="divide-y divide-line">
      {data.map((tx) => (
        <PointsRow key={tx.id} tx={tx} lesson={lessonLabel(tx.lessonId)} />
      ))}
    </ul>
  );
}

function PointsRow({ tx, lesson }: { tx: PointsTxItem; lesson: string | null }) {
  const positive = tx.amount > 0;
  const details = [lesson, tx.createdAt && formatDate(tx.createdAt)].filter(Boolean).join(' · ');
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="font-medium">{TX_TYPE[tx.type] ?? tx.type}</p>
        {details && <p className="text-sm text-muted">{details}</p>}
      </div>
      <span className={cx('font-semibold tabular-nums', positive ? 'text-success' : 'text-ink')}>
        {positive ? '+' : '−'}
        {Math.abs(tx.amount)} b
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------

function Loading() {
  return (
    <div className="flex justify-center py-6 text-muted">
      <Spinner />
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}
