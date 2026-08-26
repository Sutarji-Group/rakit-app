import { Slot } from './slot';
import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'accent'
  | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-brand-fg shadow-xs hover:bg-brand-hover active:bg-brand-active disabled:bg-brand/50',
  secondary:
    'bg-surface-sunken text-fg border border-border hover:bg-surface-raised hover:border-border-strong',
  outline:
    'border border-border-strong bg-transparent text-fg hover:bg-surface-sunken',
  ghost: 'bg-transparent text-fg-muted hover:bg-surface-sunken hover:text-fg',
  danger: 'bg-danger text-white shadow-xs hover:opacity-90',
  accent: 'bg-accent text-fg-inverse shadow-xs hover:bg-accent-strong hover:text-white',
  link: 'bg-transparent text-brand underline-offset-4 hover:underline p-0 h-auto',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-lg',
  icon: 'h-9 w-9 p-0 rounded-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  /** Merender elemen anak sebagai tombol — berguna untuk <Link>. */
  asChild?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  asChild = false,
  leadingIcon,
  trailingIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-[background-color,border-color,color,opacity,transform] duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        'disabled:pointer-events-none disabled:opacity-55',
        'active:translate-y-px',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Spinner /> : leadingIcon}
      {children}
      {!isLoading && trailingIcon}
    </Comp>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('size-4 shrink-0 animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
