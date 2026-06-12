'use client'

import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

type Variante = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  chargement?: boolean
  pleineLargeur?: boolean
}

const STYLES: Record<Variante, string> = {
  primary: 'bg-pressci-primary text-white active:bg-pressci-dark',
  secondary: 'bg-pressci-secondary text-white active:bg-pressci-primary',
  outline:
    'border border-pressci-primary text-pressci-primary bg-white active:bg-pressci-light',
  danger: 'bg-red-600 text-white active:bg-red-700',
  ghost: 'text-pressci-primary bg-transparent active:bg-pressci-light',
}

export default function Button({
  variante = 'primary',
  chargement = false,
  pleineLargeur = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-card px-4 py-3 text-base font-semibold transition-colors disabled:opacity-50',
        STYLES[variante],
        pleineLargeur && 'w-full',
        className
      )}
      disabled={disabled || chargement}
      {...props}
    >
      {chargement && (
        <span className={cn('spinner', variante === 'outline' || variante === 'ghost' ? 'spinner-dark' : '')} />
      )}
      {children}
    </button>
  )
}
