'use client'

import { useClients } from '@/hooks/useClients'
import { usePressing } from '@/hooks/usePressing'
import { usePressingsResume } from '@/hooks/usePressingsResume'
import { useTickets } from '@/hooks/useTickets'

/**
 * Précharge en arrière-plan les données les plus consultées dès l'ouverture
 * de l'application : la première visite de chaque page est ainsi instantanée.
 * Ne rend rien à l'écran. Grâce à la déduplication et à la fenêtre de
 * fraîcheur du cache, aucune requête n'est faite en double.
 */
export default function PrechargeurDonnees() {
  const { pressing, pressings } = usePressing()
  useTickets(pressing?.id ?? null, 'tous')
  useClients(pressing?.id ?? null)
  usePressingsResume(pressings)
  return null
}
