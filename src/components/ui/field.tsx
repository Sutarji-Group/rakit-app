'use client';

import { cn } from '@/lib/utils';
import { useId } from 'react';
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

const CONTROL_BASE =
  'w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg shadow-xs ' +
  'placeholder:text-fg-subtle transition-[border-color,box-shadow] ' +
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)] ' +
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-subtle';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('text-sm font-medium text-fg', className)} {...props} />
  );
}

export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

/** Pembungkus label + kontrol + pesan bantuan/error yang konsisten. */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leadingIcon?: ReactNode;
}

export function Input({ className, invalid, leadingIcon, ...props }: InputProps) {
  if (leadingIcon) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">
          {leadingIcon}
        </span>
        <input
          className={cn(CONTROL_BASE, 'h-10 pl-9', invalid && 'border-danger', className)}
          aria-invalid={invalid || undefined}
          {...props}
        />
      </div>
    );
  }
  return (
    <input
      className={cn(CONTROL_BASE, 'h-10', invalid && 'border-danger', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(CONTROL_BASE, 'min-h-24 py-2 leading-relaxed', invalid && 'border-danger', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Select({
  className,
  invalid,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select
        className={cn(
          CONTROL_BASE,
          'h-10 appearance-none pr-9',
          invalid && 'border-danger',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 16 16"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
        fill="none"
        aria-hidden="true"
      >
        <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function Checkbox({
  className,
  label,
  hint,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; hint?: ReactNode }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={inputId}
        type="checkbox"
        className={cn(
          'mt-0.5 size-4 shrink-0 cursor-pointer rounded border-border-strong text-brand',
          'accent-[var(--brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          className,
        )}
        {...props}
      />
      {(label || hint) && (
        <div className="flex flex-col gap-0.5">
          {label && (
            <label htmlFor={inputId} className="cursor-pointer text-sm leading-snug text-fg">
              {label}
            </label>
          )}
          {hint && <span className="text-xs leading-snug text-fg-subtle">{hint}</span>}
        </div>
      )}
    </div>
  );
}

/** Sakelar tambah/hapus fitur di kartu konfigurator (C2.7). */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  label,
  className,
  size = 'md',
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const dims = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const knob = size === 'sm' ? 'size-4' : 'size-5';
  const shift = size === 'sm' ? 'translate-x-4' : 'translate-x-5';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
        'transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        'disabled:cursor-not-allowed disabled:opacity-50',
        dims,
        checked ? 'bg-brand' : 'bg-border-strong',
        className,
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
          knob,
          checked ? shift : 'translate-x-0',
        )}
      />
    </button>
  );
}
