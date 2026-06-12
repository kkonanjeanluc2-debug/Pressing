import { cn, STATUT_COULEURS, STATUT_LABELS } from '@/lib/utils'
import type { StatutTicket } from '@/types'

interface BadgeProps {
  statut?: StatutTicket
  className?: string
  children?: React.ReactNode
}

export default function Badge({ statut, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        statut ? STATUT_COULEURS[statut] : 'bg-gray-100 text-gray-600',
        className
      )}
    >
      {children ?? (statut ? STATUT_LABELS[statut] : null)}
    </span>
  )
}
