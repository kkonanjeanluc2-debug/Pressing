‘use client’

import Button from ‘@/components/ui/Button’
import Input from ‘@/components/ui/Input’
import SansPressing from ‘@/components/ui/SansPressing’
import { useClients } from ‘@/hooks/useClients’
import { usePressing } from ‘@/hooks/usePressing’
import { useProfil } from ‘@/hooks/useProfil’
import { invaliderParPrefixe } from ‘@/lib/cache’
import { createClient as createSupabase } from ‘@/lib/supabase/client’
import { formatFCFA, normaliserTelephone, validerTelephone } from ‘@/lib/utils’
import Link from ‘next/link’
import { useState } from ‘react’

export default function ClientsPage() {
  const { pressing, pressings, chargement: chargementPressing } = usePressing()
  const { peut } = useProfil()
  const ids = pressings.map((p) => p.id)
  const { clients, chargement, erreur, recharger } = useClients(ids.length > 0 ? ids : null)
  const [recherche, setRecherche] = useState(‘’)

  // Formulaire de création
  const [afficherForm, setAfficherForm] = useState(false)
  const [nom, setNom] = useState(‘’)
  const [telephone, setTelephone] = useState(‘’)
  const [pressingChoisi, setPressingChoisi] = useState<string>(() => pressings[0]?.id ?? ‘’)
  const [enregistrement, setEnregistrement] = useState(false)
  const [erreurForm, setErreurForm] = useState<string | null>(null)

  if (!chargementPressing && !pressing) return <SansPressing />

  const rechercheNorm = recherche.trim().toLowerCase()
  const clientsFiltres = rechercheNorm
    ? clients.filter(
        (c) =>
          c.nom.toLowerCase().includes(rechercheNorm) || c.telephone.includes(rechercheNorm)
      )
    : clients

  function ouvrirForm() {
    setNom(‘’)
    setTelephone(‘’)
    setPressingChoisi(pressings[0]?.id ?? ‘’)
    setErreurForm(null)
    setAfficherForm(true)
  }

  async function creerClient() {
    const nomTrim = nom.trim()
    const telNorm = normaliserTelephone(telephone)
    if (nomTrim.length < 2) { setErreurForm(‘Le nom doit avoir au moins 2 caractères.’); return }
    if (!validerTelephone(telephone)) { setErreurForm(‘Le numéro doit avoir 10 chiffres (ex : 07 07 07 07 07).’); return }
    const pid = pressingChoisi || pressings[0]?.id
    if (!pid) { setErreurForm(‘Aucun pressing sélectionné.’); return }

    setEnregistrement(true)
    setErreurForm(null)
    const supabase = createSupabase()
    const { error } = await supabase
      .from(‘clients’)
      .insert({ pressing_id: pid, nom: nomTrim, telephone: telNorm })
    setEnregistrement(false)

    if (error) {
      setErreurForm(‘La création a échoué. Vérifiez que ce numéro n\’est pas déjà utilisé.’)
      return
    }

    invaliderParPrefixe(‘clients_’)
    setAfficherForm(false)
    await recharger()
  }

  return (
    <div className="space-y-4 px-4 pt-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-pressci-dark">Clients</h1>
          <p className="text-sm text-gray-500">
            {clients.length} client{clients.length > 1 ? ‘s’ : ‘’} enregistré
            {clients.length > 1 ? ‘s’ : ‘’}
          </p>
        </div>
        {peut(‘gerer_clients’) && (
          <button
            type="button"
            onClick={ouvrirForm}
            className="flex items-center gap-1.5 rounded-card bg-pressci-primary px-4 py-2.5 text-sm font-semibold text-white active:brightness-90"
          >
            + Nouveau client
          </button>
        )}
      </header>

      <input
        type="search"
        placeholder="Rechercher par nom ou téléphone…"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        className="w-full rounded-card border border-gray-300 bg-white px-3 py-3 outline-none focus:border-pressci-primary focus:ring-2 focus:ring-pressci-accent lg:max-w-sm"
      />

      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {chargement ? (
        <div className="flex justify-center py-10">
          <span className="spinner spinner-dark h-8 w-8" />
        </div>
      ) : clientsFiltres.length === 0 ? (
        <div className="py-10 text-center text-gray-500">
          <p className="mb-2 text-4xl">👥</p>
          <p>Aucun client pour l’instant.</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
          {clientsFiltres.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`} className="block">
              <div className="flex items-center justify-between rounded-card border border-gray-200 bg-white p-4 active:bg-gray-50">
                <div>
                  <p className="font-semibold text-gray-800">
                    {c.nom}{‘ ‘}
                    {c.nombre_depots >= 5 && (
                      <span title="Client fidèle" className="text-sm">⭐</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {c.telephone} · {c.nombre_depots} dépôt{c.nombre_depots > 1 ? ‘s’ : ‘’}
                  </p>
                </div>
                {c.solde_creance > 0 && (
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                    {formatFCFA(c.solde_creance)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal de création */}
      {afficherForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-card bg-white p-5">
            <h2 className="mb-4 text-lg font-bold text-pressci-dark">Nouveau client</h2>
            <div className="space-y-3">
              {pressings.length > 1 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Pressing</label>
                  <select
                    value={pressingChoisi}
                    onChange={(e) => setPressingChoisi(e.target.value)}
                    className="w-full rounded-card border border-gray-300 bg-white px-3 py-3 outline-none focus:border-pressci-primary"
                  >
                    {pressings.map((p) => (
                      <option key={p.id} value={p.id}>{p.nom}</option>
                    ))}
                  </select>
                </div>
              )}
              <Input
                label="Nom du client"
                placeholder="Ex : Aya Koné"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                autoFocus
              />
              <Input
                label="Téléphone"
                type="text"
                inputMode="tel"
                placeholder="07 00 00 00 00"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
              />
              {erreurForm && (
                <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreurForm}</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button className="flex-1" chargement={enregistrement} onClick={() => void creerClient()}>
                  Créer le client
                </Button>
                <Button variante="ghost" className="flex-1" onClick={() => setAfficherForm(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
