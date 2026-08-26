'use client';

import { Children, cloneElement, isValidElement } from 'react';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SlotProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

/**
 * Meneruskan props ke satu elemen anak — pola `asChild`.
 *
 * Memungkinkan <Button asChild><Link …/></Button> tanpa membungkus DOM ekstra
 * dan tanpa menyarangkan <a> di dalam <button>, yang tidak sah secara HTML.
 *
 * Implementasi ini sengaja TIDAK memakai Children.only(). Fungsi itu melempar
 * kesalahan begitu anaknya sampai berupa larik berisi satu elemen — dan itu
 * bisa terjadi saat elemen melintasi batas Server Component menuju Client
 * Component pada build produksi, meski di mode pengembangan tampak baik-baik
 * saja. Akibatnya satu tombol dapat menjatuhkan seluruh halaman menjadi 500,
 * dan hanya di produksi. Primitif setingkat ini tidak boleh punya kegagalan
 * seperti itu, jadi anak dinormalkan lebih dulu dan kasus tak terduga
 * dirender apa adanya alih-alih melempar.
 */
export function Slot({ children, className, ...props }: SlotProps) {
  const elements = Children.toArray(children).filter(isValidElement);

  if (elements.length !== 1) {
    return <>{children}</>;
  }

  const child = elements[0] as ReactElement<HTMLAttributes<HTMLElement>>;
  const childProps = child.props as HTMLAttributes<HTMLElement> & { className?: string };

  return cloneElement(child, {
    ...props,
    ...childProps,
    className: cn(className, childProps.className),
  });
}
