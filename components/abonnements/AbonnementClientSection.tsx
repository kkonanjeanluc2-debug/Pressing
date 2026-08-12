'use client'

import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatFCFA } from '@/lib/utils'
import type { AbonnementClient, FormuleAbonnement } from '@/types'
import { useEffect, useState } from 'react'

interface Props {
  clientId: string
  pressingId: string
  peutGerer: boolean
}

function statutEffectif(abo: AbonnementClient): 'actif' | 'epuise' | 'expire' {
  if (new Date(abo.date_fin) < new Date()) return 'expire'
  if (abo.vetements_utilises >= abo.quota_vetements) return 'epuise'
  return 'actif'
}

export default function AbonnementClientSection({ clientId, pressingId, peutGerer }: Props) {
  const supabase = createClient()

  const [aboActif, setAboActif] = useState<AbonnementClient | null>(null)
  const [historique, setHistorique] = useState<AbonnementClient[]>([])
  const [formules, setFormules] = useState<FormuleAbonnement[]>([])
  const [chargement, setChargement] = useState(true)
  const [afficherForm, setAfficherForm] = useState(false)

  const [formuleChoisie, setFormuleChoisie] = useState<FormuleAbonnement | null>(null)
  const [nomLibre, setNomLibre] = useState('')
  const [quotaLibre, setQuotaLibre] = useState('')
  const [prixLibre, setPrixLibre] = useState('')
  const [dateDebut, setDateDebut] = useState(() => new Date().toISOString().slice(0, 10))
  const [modeLibre, setModeLibre] = useState(false)
  const [enregistrement, setEnregistrement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function charger() {
    setChargement(true)
    const [{ data: abos }, { data: frmls }] = await Promise.all([
      supabase
        .from('abonnements_clients')
        .select('*')
        .eq('client_id', clientId)
        .eq('pressing_id', pressingId)
        .order('created_at', { ascending: false }),
      supabase
        .from('formules_abonnement')
        .select('*')
        .eq('pressing_id', pressingId)
        .eq('actif', true)
        .order('quota_vetements'),
    ])

    const tous = (abos ?? []) as AbonnementClient[]
    const actif = tous.find((a) => statutEffectif(a) === 'actif') ?? null
    setAboActif(actif)
    setHistorique(tous.filter((a) => statutEffectif(a) !== 'actif'))
    setFormules((frmls ?? []) as FormuleAbonnement[])
    setChargement(false)
  }

  useEffect(() => { void charger() }, [clientId, pressingId]) // eslint-disable-line react-hooks/exhaustive-deps

  function ouvrirForm() {
    setFormuleChoisie(null)
    setNomLibre('')
    setQuotaLibre('')
    setPrixLibre('')
    setDateDebut(new Date().toISOString().slice(0, 10))
    setModeLibre(false)
    setErreur(null)
    setAfficherForm(true)
  }

  async function souscrire() {
    setErreur(null)
    const debut = new Date(dateDebut)
    debut.setHours(0, 0, 0, 0)
    const fin = new Date(debut)
    fin.setDate(fin.getDate() + 30)

    let nomFormule: string
    let quota: number
    let prix: number
    let formuleId: string | null

    if (modeLibre) {
      nomFormule = nomLibre.trim()
      quota = parseInt(quotaLibre, 10) || 0
      prix = parseInt(prixLibre, 10) || 0
      formuleId = null
      if (nomFormule.length < 2) { setErreur('Entrez un nom de formule.'); return }
      if (quota < 1) { setErreur('Le quota doit être ≥ 1.'); return }
    } else {
      if (!formuleChoisie) { setErreur('Choisissez une formule.'); return }
      nomFormule = formuleChoisie.nom
      quota = formuleChoisie.quota_vetements
      prix = formuleChoisie.prix
      formuleId = formuleChoisie.id
    }

    setEnregistrement(true)
    const { error } = await supabase.from('abonnements_clients').insert({
      pressing_id: pressingId,
      client_id: clientId,
      formule_id: formuleId,
      nom_formule: nomFormule,
      quota_vetements: quota,
      prix,
      date_debut: debut.toISOString(),
      date_fin: fin.toISOString(),
      statut: 'actif',
    })
    setEnregistrement(false)
    if (error) { setErreur('Échec de la souscription. Réessayez.'); return }
    setAfficherForm(false)
    await charger()
  }

  if (chargement) {
    return (
      <Card>
        <p className="text-sm text-gray-400">Chargement abonnement…</p>
      </Card>
    )
  }

  const resteVetements = aboActif
    ? Math.max(0, aboActif.quota_vetements - aboActif.vetements_utilises)
    : 0
  const pctUtilise = aboActif
    ? Math.min(100, Math.round((aboActif.vetements_utilises / aboActif.quota_vetements) * 100))
    : 0
  const jRestants = aboActif
    ? Math.max(0, Math.ceil((new Date(aboActif.date_fin).getTime() - Date.now()) / 86_400_000))
    : 0

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Abonnement mensuel</h2>
        {peutGerer && !aboActif && !afficherForm && (
          <button
            type="button"
            onClick={ouvrirForm}
            className="text-sm font-semibold text-pressci-primary"
          >
            + Souscrire
          </button>
        )}
      </div>

      {/* Abonnement actif */}
      {aboActif && (
        <div className="rounded-card border border-green-200 bg-green-50 p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="font-semibold text-green-800">{aboActif.nom_formule}</p>
            <span className="rounded-full bg-green-200 px-2 py-0.5 text-[11px] font-bold text-green-800">
              ACTIF
            </span>
          </div>
          <p className="text-xs text-green-700">
            {resteVetements} vêtement{resteVetements > 1 ? 's' : ''} restant{resteVetements > 1 ? 's' : ''} sur {aboActif.quota_vetements}
            {' · '}{jRestants} jour{jRestants > 1 ? 's' : ''} restant{jRestants > 1 ? 's' : ''}
          </p>

          {/* Barre de progression */}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-green-200">
            <div
              className="h-full rounded-full bg-green-600 transition-all"
              style={{ width: `${pctUtilise}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[11px] text-green-700">
            {aboActif.vetements_utilises} / {aboActif.quota_vetements} pièces utilisées
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Du {formatDate(aboActif.date_debut)} au {formatDate(aboActif.date_fin)}
            {aboActif.prix > 0 ? ` · ${formatFCFA(aboActif.prix)}` : ''}
          </p>
        </div>
      )}

      {/* Formulaire de souscription */}
      {afficherForm && (
        <div className="space-y-3 rounded-card border border-dashed border-pressci-primary bg-pressci-light p-3">
          <p className="text-xs font-semibold text-gray-700">Nouvelle souscription (30 jours)</p>

          {/* Choix formule ou libre */}
          {formules.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setModeLibre(false); setFormuleChoisie(null) }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${!modeLibre ? 'border-pressci-primary bg-white text-pressci-primary' : 'border-gray-300 text-gray-500'}`}
              >
                Formule existante
              </button>
              <button
                type="button"
                onClick={() => { setModeLibre(true); setFormuleChoisie(null) }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${modeLibre ? 'border-pressci-primary bg-white text-pressci-primary' : 'border-gray-300 text-gray-500'}`}
              >
                Formule libre
              </button>
            </div>
          )}

          {!modeLibre && formules.length > 0 ? (
            <div className="space-y-2">
              {formules.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormuleChoisie(f)}
                  className={`w-full rounded-card border px-3 py-2.5 text-left transition-colors ${
                    formuleChoisie?.id === f.id
                      ? 'border-pressci-primary bg-white'
                      : 'border-gray-200 bg-white hover:border-pressci-primary'
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-800">{f.nom}</p>
                  <p className="text-xs text-gray-500">
                    {f.quota_vetements} vêtements · {formatFCFA(f.prix)}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                label="Nom de la formule"
                placeholder="Ex : Abonnement 15 vêtements"
                value={nomLibre}
                onChange={(e) => setNomLibre(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Quota (vêtements)"
                  type="number"
                  min={1}
                  placeholder="Ex : 15"
                  value={quotaLibre}
                  onChange={(e) => setQuotaLibre(e.target.value)}
                />
                <Input
                  label="Prix (FCFA)"
                  type="number"
                  min={0}
                  placeholder="Ex : 10000"
                  value={prixLibre}
                  onChange={(e) => setPrixLibre(e.target.value)}
                />
              </div>
            </div>
          )}

          <Input
            label="Date de début"
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
          />

          {erreur && (
            <p className="rounded-card bg-red-50 px-3 py-2 text-xs text-red-700">{erreur}</p>
          )}

          <div className="flex gap-2">
            <Button className="flex-1" chargement={enregistrement} onClick={() => void souscrire()}>
              Confirmer
            </Button>
            <Button variante="ghost" className="flex-1" onClick={() => setAfficherForm(false)}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Historique */}
      {historique.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-gray-500">Historique</p>
          <div className="divide-y divide-gray-100">
            {historique.map((h) => {
              const s = statutEffectif(h)
              return (
                <div key={h.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-600">{h.nom_formule}</p>
                    <p className="text-[11px] text-gray-400">
                      {h.vetements_utilises}/{h.quota_vetements} pièces · {formatDate(h.date_debut)} – {formatDate(h.date_fin)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      s === 'epuise'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {s === 'epuise' ? 'Épuisé' : 'Expiré'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!aboActif && historique.length === 0 && !afficherForm && (
        <p className="py-2 text-center text-sm text-gray-400">
          Ce client n'a pas d'abonnement actif.
        </p>
      )}
    </Card>
  )
}
