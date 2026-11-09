'use client';

import { useState, type FormEvent } from 'react';
import { Alert, Button, Card, cx, inputClass } from '@/components/ui';
import { updateMyProfile } from '@/lib/profile-data';

// Limity zodpovedajú firestore.rules (displayName 1–60, bio do 500 znakov).
const NAME_MAX = 60;
const BIO_MAX = 500;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

interface Props {
  uid: string;
  email: string | null;
  displayName: string;
  bio: string;
}

export function AboutCard({ uid, email, displayName, bio }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bioDraft, setBioDraft] = useState(bio);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get('displayName') ?? '').trim();
    if (name.length < 2) {
      setError('Meno musí mať aspoň 2 znaky.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await updateMyProfile(uid, { displayName: name, bio: bioDraft.trim() });
      setEditing(false);
    } catch {
      setError('Uloženie zlyhalo. Skús to znova.');
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span
              aria-hidden
              className="grid size-16 shrink-0 place-items-center rounded-full bg-pink-soft font-display text-2xl font-extrabold"
            >
              {initials(displayName)}
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight break-words sm:text-4xl">
                {displayName}
              </h1>
              {email && <p className="mt-1 truncate text-sm text-muted">{email}</p>}
            </div>
          </div>
          <Button
            variant="secondary"
            className="h-10 shrink-0 px-4 text-sm"
            onClick={() => {
              setBioDraft(bio);
              setEditing(true);
            }}
          >
            Upraviť
          </Button>
        </div>
        <p className="mt-5 max-w-prose whitespace-pre-line leading-relaxed">
          {bio || <span className="text-muted">Zatiaľ si o sebe nič nenapísal(a). Pridaj pár viet, nech ťa spolužiaci spoznajú.</span>}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="displayName" className="text-sm font-semibold">
            Meno
          </label>
          <input
            id="displayName"
            name="displayName"
            defaultValue={displayName}
            required
            minLength={2}
            maxLength={NAME_MAX}
            className={cx(inputClass, 'h-12')}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bio" className="text-sm font-semibold">
            O mne
          </label>
          <textarea
            id="bio"
            value={bioDraft}
            onChange={(e) => setBioDraft(e.target.value)}
            maxLength={BIO_MAX}
            rows={4}
            placeholder="Napr. 3. ročník, baví ma matika a programovanie, hľadám pomoc s nemčinou."
            className={cx(inputClass, 'py-2.5')}
          />
          <p className="self-end text-xs tabular-nums text-muted">
            {bioDraft.length}/{BIO_MAX}
          </p>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
            Zrušiť
          </Button>
          <Button type="submit" loading={saving}>
            Uložiť
          </Button>
        </div>
      </form>
    </Card>
  );
}
