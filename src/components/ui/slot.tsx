'use client';

import { Children, cloneElement, isValidElement } from 'react';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SlotProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

/**
 * Meneruskan props ke satu elemen anak, dipakai pola `asChild`.
 * Memungkinkan <Button asChild><Link …/></Button> tanpa membungkus DOM ekstra.
 */
export function Slot({ children, className, ...props }: SlotProps) {
  const child = Children.only(children);
  if (!isValidElement(child)) return null;

  const childProps = child.props as HTMLAttributes<HTMLElement> & { className?: string };

  return cloneElement(child as ReactElement<HTMLAttributes<HTMLElement>>, {
    ...props,
    ...childProps,
    className: cn(className, childProps.className),
  });
}
