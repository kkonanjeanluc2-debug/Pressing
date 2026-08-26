'use client'

import AbonnementClientSection from '@/components/abonnements/AbonnementClientSection'
import TicketCard from '@/components/tickets/TicketCard'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useClient } from '@/hooks/useClients'
import { usePressing } from '@/hooks/usePressing'
import { useProfil } from '@/hooks/useProfil'
import { createClient as createSupabase } from '@/lib/supabase/client'
import { formatFCFA, messageSmsRelance } from '@/lib/utils'
import Link from 'next/link'
import { useState } from 'react'

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const { pressings } = usePressing()
  const { peut } = useProfil()
  const { client, tickets, chargement, erreur, recharger } = useClient(params.id)
  const [messageOk, setMessageOk] = useState<string | null>(null)

  // Édition du client
  const [edition, setEdition] = useState(false)
  const [nomEdit, setNomEdit] = useState('')
  const [telEdit, setTelEdit] = useState('')
  const [sauvegarde, setSauvegarde] = useState(false)
  const [erreurEdit, setErreurEdit] = useState<string | null>(null)

  function ouvrirEdition() {
    if (!client) return
    setNomEdit(client.nom)
    setTelEdit(client.telephone)
    setErreurEdit(null)
    setEdition(true)
  }

  async function sauvegarderClient() {
    if (!client) return
    const nom = nomEdit.trim()
    const tel = telEdit.trim()
    if (nom.length < 2) { setErreurEdit('Le nom doit avoir au moins 2 caractères.'); return }
    if (tel.length < 8) { setErreurEdit('Vérifiez le numéro de téléphone.'); return }
    setSauvegarde(true)
    setErreurEdit(null)
    const supabase = createSupabase()
    const { error } = await supabase
      .from('clients')
      .update({ nom, telephone: tel })
      .eq('id', client.id)
    setSauvegarde(false)
    if (error) { setErreurEdit('La sauvegarde a échoué. Réessayez.'); return }
    setEdition(false)
    recharger()
  }

  /** Relance de créance : ouvre le WhatsApp du client avec le message. */
  function relancerCreance() {
    if (!client) return
    const pressing = pressings.find((p) => p.id === client.pressing_id) ?? pressings[0]
    if (!pressing) return
    const texte = messageSmsRelance(client.nom, pressing.nom, client.solde_creance)
    const tel = client.telephone.replace(/\D/g, '').replace(/^225/, '')
    window.open(`https://wa.me/225${tel}?text=${encodeURIComponent(texte)}`, '_blank')
    setMessageOk('Discussion WhatsApp ouverte avec le message de relance — appuyez sur Envoyer. ✅')
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
        {edition ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
              <input
                type="text"
                value={nomEdit}
                onChange={(e) => setNomEdit(e.target.value)}
                className="w-full rounded-card border border-gray-300 px-3 py-3 outline-none focus:border-pressci-primary"
                placeholder="Nom du client"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
              <input
                type="text"
                inputMode="tel"
                value={telEdit}
                onChange={(e) => setTelEdit(e.target.value)}
                className="w-full rounded-card border border-gray-300 px-3 py-3 outline-none focus:border-pressci-primary"
                placeholder="07 00 00 00 00"
              />
            </div>
            {erreurEdit && (
              <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreurEdit}</p>
            )}
            <div className="flex gap-2">
              <Button className="flex-1" chargement={sauvegarde} onClick={() => void sauvegarderClient()}>
                Enregistrer
              </Button>
              <Button variante="ghost" className="flex-1" onClick={() => setEdition(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pressci-light text-lg font-bold text-pressci-primary">
                {client.nom.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
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
              {peut('gerer_clients') && (
                <button
                  type="button"
                  onClick={ouvrirEdition}
                  className="shrink-0 text-sm font-semibold text-pressci-primary"
                >
                  ✏️ Modifier
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-center">
              <div>
                <p className="text-lg font-bold text-pressci-dark">{client.nombre_depots}</p>
                <p className="text-xs text-gray-500">Dépôts</p>
              </div>
              <div>
                <p className={`text-lg font-bold ${client.solde_creance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatFCFA(client.solde_creance)}
                </p>
                <p className="text-xs text-gray-500">Créance en cours</p>
              </div>
            </div>
          </>
        )}
      </Card>

      {client.solde_creance > 0 && peut('envoyer_sms') && (
        <button
          type="button"
          onClick={relancerCreance}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-card bg-[#25D366] px-4 py-3 text-base font-semibold text-white active:brightness-90"
        >
          💬 Relancer sur WhatsApp ({formatFCFA(client.solde_creance)})
        </button>
      )}

      {messageOk && (
        <p className="rounded-card bg-green-50 px-3 py-2 text-sm text-green-700">{messageOk}</p>
      )}

      <AbonnementClientSection
        clientId={client.id}
        pressingId={client.pressing_id}
        peutGerer={peut('gerer_clients')}
        client={client}
        pressing={pressings.find((p) => p.id === client.pressing_id) ?? null}
      />

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
