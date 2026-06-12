import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { formatDateCourte, formatFCFA, formatHeure } from '@/lib/utils'
import type { Pressing, Ticket } from '@/types'
import Link from 'next/link'

interface ActiviteRecenteProps {
  tickets: Ticket[]
  pressings: Pressing[]
}

const TICKETS_PAR_PRESSING = 4

function LigneTicket({ t }: { t: Ticket }) {
  const nbPieces = (t.articles ?? []).reduce((s, a) => s + a.quantite, 0)
  return (
    <Link
      href={`/tickets/${t.id}`}
      className="flex items-center justify-between gap-3 py-2.5 active:bg-gray-50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">
          {t.numero} — {t.client?.nom ?? 'Client'}
        </p>
        <p className="text-xs text-gray-400">
          {t.statut === 'recupere' && t.date_recuperation
            ? `Récupéré le ${formatDateCourte(t.date_recuperation)} à ${formatHeure(t.date_recuperation)}`
            : `Déposé le ${formatDateCourte(t.date_depot)}`}{' '}
          · {nbPieces} pièce{nbPieces > 1 ? 's' : ''}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold text-gray-700">
        {formatFCFA(t.montant_total)}
      </span>
      <Badge statut={t.statut} />
    </Link>
  )
}

/** Derniers dépôts, organisés par pressing, avec leur statut en direct. */
export default function ActiviteRecente({ tickets, pressings }: ActiviteRecenteProps) {
  // Un seul pressing (cas de l'agent) : liste simple
  const groupes =
    pressings.length > 1
      ? pressings
          .map((pressing) => ({
            pressing,
            lignes: tickets
              .filter((t) => t.pressing_id === pressing.id)
              .slice(0, TICKETS_PAR_PRESSING),
          }))
          .filter((g) => g.lignes.length > 0)
      : null

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Activité récente</h2>
        <Link href="/tickets" className="text-sm font-semibold text-pressci-primary">
          Tout voir →
        </Link>
      </div>

      {tickets.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          Aucun dépôt pour l’instant — le premier apparaîtra ici.
        </p>
      ) : groupes ? (
        /* ---- Organisée par pressing ---- */
        <div className="space-y-4">
          {groupes.map(({ pressing, lignes }) => (
            <section key={pressing.id}>
              <div className="flex items-center justify-between rounded-card bg-pressci-light px-3 py-1.5">
                <h3 className="text-xs font-bold text-pressci-dark">
                  🏪 {pressing.nom}
                  {pressing.commune ? (
                    <span className="ml-1 font-normal text-pressci-dark/60">
                      — {pressing.commune}
                    </span>
                  ) : null}
                </h3>
                <Link
                  href={`/tickets?pressing=${pressing.id}`}
                  className="text-xs font-semibold text-pressci-primary"
                >
                  Voir →
                </Link>
              </div>
              <div className="divide-y divide-gray-100 px-1">
                {lignes.map((t) => (
                  <LigneTicket key={t.id} t={t} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* ---- Un seul pressing : liste simple ---- */
        <div className="divide-y divide-gray-100">
          {tickets.slice(0, 6).map((t) => (
            <LigneTicket key={t.id} t={t} />
          ))}
        </div>
      )}
    </Card>
  )
}
