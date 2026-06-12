'use client'

import TicketCard from '@/components/tickets/TicketCard'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useClient } from '@/hooks/useClients'
import { usePressing } from '@/hooks/usePressing'
import { formatFCFA, messageSmsRelance } from '@/lib/utils'
import Link from 'next/link'
import { useState } from 'react'

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const { pressing } = usePressing()
  const { client, tickets, chargement, erreur } = useClient(params.id)
  const [envoiSms, setEnvoiSms] = useState(false)
  const [messageSms, setMessageSms] = useState<string | null>(null)
  const [messageWhatsApp, setMessageWhatsApp] = useState<string | null>(null)

  async function relancerCreance() {
    if (!client || !pressing) return
    setEnvoiSms(true)
    setMessageSms(null)
    setMessageWhatsApp(null)

    const texte = messageSmsRelance(client.nom, pressing.nom, client.solde_creance)
    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id, message: texte }),
      })
      const data = (await res.json()) as { succes: boolean }
      if (data.succes) {
        setMessageSms('SMS de relance envoyé ✅')
      } else {
        setMessageWhatsApp(texte)
      }
    } catch {
      setMessageWhatsApp(texte)
    }
    setEnvoiSms(false)
  }

  if (chargement) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  if (erreur || !client) {
    return (
      <div className="px-4 py-10 text-center text-gray-600">
        <p className="mb-2">Client introuvable.</p>
        <Link href="/clients" className="font-semibold text-pressci-primary">
          Retour aux clients
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pt-5">
      <header className="flex items-center gap-3">
        <Link
          href="/clients"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-pressci-dark">Fiche client</h1>
      </header>

      <Card>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pressci-light text-lg font-bold text-pressci-primary">
            {client.nom.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-800">
              {client.nom}{' '}
              {client.nombre_depots >= 5 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  ⭐ Fidèle
                </span>
              )}
            </p>
            <a href={`tel:${client.telephone}`} className="text-sm text-pressci-primary">
              {client.telephone}
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-center">
          <div>
            <p className="text-lg font-bold text-pressci-dark">{client.nombre_depots}</p>
            <p className="text-xs text-gray-500">Dépôts</p>
          </div>
          <div>
            <p
              className={`text-lg font-bold ${client.solde_creance > 0 ? 'text-orange-600' : 'text-green-600'}`}
            >
              {formatFCFA(client.solde_creance)}
            </p>
            <p className="text-xs text-gray-500">Créance en cours</p>
          </div>
        </div>
      </Card>

      {client.solde_creance > 0 && (
        <Button
          pleineLargeur
          variante="secondary"
          chargement={envoiSms}
          onClick={() => void relancerCreance()}
        >
          📱 Relancer par SMS ({formatFCFA(client.solde_creance)})
        </Button>
      )}

      {messageSms && (
        <p className="rounded-card bg-green-50 px-3 py-2 text-sm text-green-700">{messageSms}</p>
      )}

      {messageWhatsApp && (
        <Card className="space-y-2">
          <p className="text-sm text-red-700">
            Le SMS n’est pas parti. Envoyez le message par WhatsApp :
          </p>
          <p className="rounded-card bg-gray-50 px-3 py-2 text-sm text-gray-700">{messageWhatsApp}</p>
          <a
            href={`https://wa.me/225${client.telephone.replace(/\D/g, '')}?text=${encodeURIComponent(messageWhatsApp)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variante="secondary" pleineLargeur>
              Ouvrir WhatsApp
            </Button>
          </a>
        </Card>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">
          Historique des dépôts ({tickets.length})
        </h2>
        {tickets.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">Aucun dépôt pour ce client.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tickets.map((t) => (
              <TicketCard key={t.id} ticket={{ ...t, client }} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
