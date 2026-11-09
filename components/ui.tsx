// components/ui.tsx
// Základné stavebné prvky UI. Farby berú z tokenov v app/globals.css
// (pravidlá rolí farieb sú popísané tam).

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Tlačidlo
// ---------------------------------------------------------------------------
// primary   čierne, hlavná akcia (funguje na bielej aj na ružovej ploche)
// secondary biele s tmavým okrajom
// ghost     len text, vedľajšie akcie v hlavičke a kartách

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white hover:bg-ink/85',
  secondary: 'border-2 border-ink bg-surface text-ink hover:bg-subtle',
  ghost: 'text-ink hover:bg-subtle',
};

export function buttonClass(variant: ButtonVariant = 'primary', extra?: string) {
  return cx(
    'inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    BUTTON_VARIANTS[variant],
    extra,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export function Button({ variant = 'primary', loading, disabled, className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={buttonClass(variant, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="none" className={cx('size-4', className)}>
      <path d="M4 10h11m0 0-4.5-4.5M15 10l-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx('inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
    />
  );
}

// ---------------------------------------------------------------------------
// Formulárové pole
// ---------------------------------------------------------------------------

export const inputClass =
  'rounded-lg border border-line bg-surface px-3.5 text-base outline-none transition-colors placeholder:text-muted/70 hover:border-muted focus:border-ink focus:ring-1 focus:ring-ink';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function Field({ label, hint, id, name, className, ...rest }: FieldProps) {
  const inputId = id ?? name;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>
      <input id={inputId} name={name} aria-describedby={hintId} className={cx(inputClass, 'h-12')} {...rest} />
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hlásenie (chyba / úspech / info)
// ---------------------------------------------------------------------------

type AlertTone = 'error' | 'success' | 'info';

const ALERT_TONES: Record<AlertTone, string> = {
  error: 'bg-danger-soft text-danger',
  success: 'bg-success-soft text-success',
  info: 'bg-subtle text-ink',
};

export function Alert({ tone = 'info', children }: { tone?: AlertTone; children: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-lg px-4 py-3 text-sm', ALERT_TONES[tone])}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Karta, odkaz a bodový odznak
// ---------------------------------------------------------------------------

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx('rounded-card border border-line bg-surface p-6', className)}>{children}</section>;
}

// Odkaz v texte: ružová nie je čitateľná ako text, preto čierny podčiarknutý.
export const linkClass = 'font-semibold text-ink underline decoration-2 underline-offset-4 hover:decoration-pink';

export function PointsBadge({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-md bg-pink px-2.5 py-1 font-display font-extrabold tabular-nums text-ink',
        className,
      )}
    >
      +{value} bodov
    </span>
  );
}

export { cx };
