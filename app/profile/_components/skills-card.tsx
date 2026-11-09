'use client';

import { useMemo, useState } from 'react';
import { Alert, Button, Card, cx } from '@/components/ui';
import { updateMyProfile, type Skill } from '@/lib/profile-data';

// firestore.rules: offeredSkillIds aj wantedSkillIds najviac 20 položiek.
const MAX_SKILLS = 20;

interface Props {
  uid: string;
  field: 'offeredSkillIds' | 'wantedSkillIds';
  title: string;
  emptyText: string;
  selectedIds: string[];
  skills: Skill[];
  skillsLoading: boolean;
  tone: 'pink' | 'neutral';
}

// Ponúkam = jemná ružová, Hľadám = sivá. Vybratá zručnosť pri úprave je vždy čierna.
const CHIP_TONES = {
  pink: 'bg-pink-soft',
  neutral: 'bg-subtle',
};

export function SkillsCard({ uid, field, title, emptyText, selectedIds, skills, skillsLoading, tone }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(selectedIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);
  const byCategory = useMemo(() => {
    const groups = new Map<string, Skill[]>();
    for (const s of skills) groups.set(s.category, [...(groups.get(s.category) ?? []), s]);
    return [...groups.entries()];
  }, [skills]);

  // Zručnosť, ktorá medzitým zmizla zo zoznamu (skrytá), sa v profile nezobrazí.
  const selected = selectedIds.map((id) => byId.get(id)).filter((s): s is Skill => Boolean(s));

  function toggle(id: string) {
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : d.length < MAX_SKILLS ? [...d, id] : d));
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await updateMyProfile(uid, { [field]: draft });
      setEditing(false);
    } catch {
      setError('Uloženie zlyhalo. Skús to znova.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">{title}</h2>
        {!editing && (
          <Button
            variant="secondary"
            className="h-10 px-4 text-sm"
            disabled={skillsLoading}
            onClick={() => {
              setDraft(selectedIds);
              setEditing(true);
            }}
          >
            Upraviť
          </Button>
        )}
      </div>

      {!editing ? (
        selected.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {selected.map((s) => (
              <li key={s.id} className={cx('rounded-lg px-3 py-1.5 text-sm font-semibold', CHIP_TONES[tone])}>
                {s.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">{emptyText}</p>
        )
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {skills.length === 0 && (
            <p className="text-sm text-muted">Zoznam zručností je prázdny. Admin ich musí najprv pridať.</p>
          )}
          {byCategory.map(([category, items]) => (
            <fieldset key={category}>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{category}</legend>
              <div className="flex flex-wrap gap-2">
                {items.map((s) => {
                  const on = draft.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(s.id)}
                      className={cx(
                        'rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors',
                        on ? 'border-ink bg-ink text-white' : 'border-line bg-surface hover:border-ink',
                      )}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <p className="text-xs tabular-nums text-muted">
            Vybraté {draft.length}/{MAX_SKILLS}
          </p>
          {error && <Alert tone="error">{error}</Alert>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Zrušiť
            </Button>
            <Button onClick={save} loading={saving}>
              Uložiť
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
