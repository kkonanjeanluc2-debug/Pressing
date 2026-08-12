'use client'

import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { formatFCFA } from '@/lib/utils'
import type { FormuleAbonnement } from '@/types'
import { useEffect, useState } from 'react'

interface Props {
  pressingId: string
}

export default function FormuleAbonnementSection({ pressingId }: Props) {
  const supabase = createClient()
  const [formules, setFormules] = useState<FormuleAbonnement[]>([])
  const [chargement, setChargement] = useState(true)
  const [afficherForm, setAfficherForm] = useState(false)

  const [nom, setNom] = useState('')
  const [quota, setQuota] = useState('')
  const [prix, setPrix] = useState('')
  const [creation, setCreation] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function charger() {
    setChargement(true)
    const { data } = await supabase
      .from('formules_abonnement')
      .select('*')
      .eq('pressing_id', pressingId)
      .order('created_at', { ascending: true })
    setFormules((data ?? []) as FormuleAbonnement[])
    setChargement(false)
  }

  useEffect(() => {
    void charger()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressingId])

  async function creerFormule() {
    setErreur(null)
    const nomTrim = nom.trim()
    const q = parseInt(quota, 10)
    const p = parseInt(prix, 10) || 0
    if (nomTrim.length < 2) { setErreur('Entrez un nom pour la formule.'); return }
    if (!q || q < 1) { setErreur('Le quota doit être ≥ 1 vêtement.'); return }

    setCreation(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('formules_abonnement').insert({
      owner_id: user?.id,
      pressing_id: pressingId,
      nom: nomTrim,
      quota_vetements: q,
      prix: p,
    })
    setCreation(false)
    if (error) { setErreur('Échec de la création. Réessayez.'); return }
    setNom(''); setQuota(''); setPrix('')
    setAfficherForm(false)
    await charger()
  }

  async function toggleActif(f: FormuleAbonnement) {
    await supabase.from('formules_abonnement').update({ actif: !f.actif }).eq('id', f.id)
    await charger()
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Formules d'abonnement</h2>
        <button
          type="button"
          onClick={() => { setAfficherForm(!afficherForm); setErreur(null) }}
          className="text-sm font-semibold text-pressci-primary"
        >
          {afficherForm ? 'Annuler' : '+ Nouvelle formule'}
        </button>
      </div>

      {afficherForm && (
        <div className="space-y-3 rounded-card border border-dashed border-pressci-primary bg-pressci-light p-3">
          <Input
            label="Nom de la formule"
            placeholder="Ex : 20 vêtements / mois"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quota (vêtements)"
              type="number"
              min={1}
              placeholder="Ex : 20"
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
            />
            <Input
              label="Prix (FCFA)"
              type="number"
              min={0}
              placeholder="Ex : 15000"
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
            />
          </div>
          {erreur && (
            <p className="rounded-card bg-red-50 px-3 py-2 text-xs text-red-700">{erreur}</p>
          )}
          <Button pleineLargeur chargement={creation} onClick={() => void creerFormule()}>
            Enregistrer
          </Button>
        </div>
      )}

      {chargement ? (
        <p className="text-sm text-gray-400">Chargement…</p>
      ) : formules.length === 0 ? (
        <p className="py-3 text-center text-sm text-gray-400">
          Aucune formule — créez-en une pour proposer des abonnements mensuels.
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {formules.map((f) => (
            <div key={f.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className={`text-sm font-semibold ${f.actif ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                  {f.nom}
                </p>
                <p className="text-xs text-gray-500">
                  {f.quota_vetements} vêtements · {formatFCFA(f.prix)} / 30 jours
                </p>
              </div>
              <button
                type="button"
                onClick={() => void toggleActif(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  f.actif
                    ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600'
                    : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700'
                }`}
              >
                {f.actif ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
