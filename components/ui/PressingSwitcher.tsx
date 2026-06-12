'use client'

import { usePressing } from '@/hooks/usePressing'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface PressingSwitcherProps {
  /** 'clair' pour fond blanc (header mobile), 'sombre' pour la sidebar */
  variante?: 'clair' | 'sombre'
  className?: string
}

const VALEUR_NOUVEAU = '__nouveau__'

/**
 * Sélecteur du pressing actif. N'apparaît en menu déroulant que si le
 * propriétaire a plusieurs pressings ; sinon affiche simplement le nom.
 */
export default function PressingSwitcher({ variante = 'clair', className }: PressingSwitcherProps) {
  const router = useRouter()
  const { pressing, pressings, changerPressing } = usePressing()

  if (!pressing) return null

  if (pressings.length <= 1) {
    return (
      <span
        className={cn(
          'font-bold',
          variante === 'sombre' ? 'text-white' : 'text-pressci-dark',
          className
        )}
      >
        {pressing.nom}
      </span>
    )
  }

  return (
    <select
      value={pressing.id}
      onChange={(e) => {
        if (e.target.value === VALEUR_NOUVEAU) {
          router.push('/pressings/nouveau')
          return
        }
        changerPressing(e.target.value)
      }}
      aria-label="Changer de pressing"
      className={cn(
        'max-w-full cursor-pointer rounded-card border px-2 py-1.5 font-bold outline-none',
        variante === 'sombre'
          ? 'border-white/20 bg-white/10 text-white'
          : 'border-gray-200 bg-white text-pressci-dark',
        className
      )}
    >
      {pressings.map((p) => (
        <option key={p.id} value={p.id} className="font-normal text-gray-900">
          {p.nom}
          {p.commune ? ` — ${p.commune}` : ''}
        </option>
      ))}
      <option value={VALEUR_NOUVEAU} className="font-normal text-gray-900">
        ➕ Nouveau pressing…
      </option>
    </select>
  )
}
