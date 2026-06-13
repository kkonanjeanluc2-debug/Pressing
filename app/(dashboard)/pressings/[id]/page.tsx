'use client'

import GestionAgents from '@/components/pressings/GestionAgents'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { usePressing } from '@/hooks/usePressing'
import { usePressingsResume } from '@/hooks/usePressingsResume'
import { useProfil } from '@/hooks/useProfil'
import { createClient } from '@/lib/supabase/client'
import { formatFCFA, formatHeure } from '@/lib/utils'
import { COMMUNES_ABIDJAN } from '@/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Periode = 'jour' | 'semaine' | 'mois'

const PERIODES: { id: Periode; label: string }[] = [
  { id: 'jour', label: "Aujourd'hui" },
  { id: 'semaine', label: '7 jours' },
  { id: 'mois', label: 'Ce mois' },
]

function debutJourLocal(decalageJours = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + decalageJours)
  d.setHours(0, 0, 0, 0)
  return d
}

function debutMoisLocal(): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function PressingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { pressings, chargement, recharger } = usePressing()
  const { role } = useProfil()
  const { resumes, chargement: chargementResumes } = usePressingsResume(pressings)

  const [periodeActive, setPeriodeActive] = useState<Periode>('jour')

  const debutPeriode =
    periodeActive === 'semaine'
      ? debutJourLocal(-6)
      : periodeActive === 'mois'
        ? debutMoisLocal()
        : debutJourLocal()

  const { donnees: totalPeriode, chargement: chargementTotal } = useDonneesCachees<number>(
    `encaisse_${params.id}_${periodeActive}_${new Date().toISOString().slice(0, 10)}`,
    async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('encaissements')
        .select('montant')
        .eq('pressing_id', params.id)
        .gte('created_at', debutPeriode.toISOString())
      return (data ?? []).reduce((s, e) => s + (e.montant as number), 0)
    },
    'Impossible de charger le total.'
  )

  // Édition des informations du pressing
  const [edition, setEdition] = useState(false)
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [adresse, setAdresse] = useState('')
  const [commune, setCommune] = useState('')
  const [sauvegarde, setSauvegarde] = useState(false)
  const [erreurEdition, setErreurEdition] = useState<string | null>(null)

  if (chargement) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  const pressing = pressings.find((p) => p.id === params.id)
  if (!pressing) {
    return (
      <div className="px-4 py-10 text-center text-gray-600">
        <p className="mb-2">Pressing introuvable.</p>
        <Link href="/pressings" className="font-semibold text-pressci-primary">
          Retour aux pressings
        </Link>
      </div>
    )
  }

  const resume = resumes.find((r) => r.pressing.id === pressing.id)

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pt-5">
      <header className="flex items-center gap-3">
        <Link
          href="/pressings"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm"
        >
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-pressci-dark">{pressing.nom}</h1>
          <p className="text-sm text-gray-500">
            {[pressing.commune, pressing.telephone].filter(Boolean).join(' · ') || 'Pressing'}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
            pressing.ouvert ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {pressing.ouvert ? '🟢 OUVERT' : 'FERMÉ'}
        </span>
      </header>

      {/* Statut d'ouverture détaillé */}
      <Card
        className={`text-sm ${pressing.ouvert ? 'border-green-200 bg-green-50' : 'bg-gray-50'}`}
      >
        {pressing.ouvert ? (
          <p className="font-medium text-green-800">
            Ouvert depuis {pressing.ouvert_depuis ? formatHeure(pressing.ouvert_depuis) : '—'}
            {pressing.ouvert_par ? ` par ${pressing.ouvert_par}` : ''}
          </p>
        ) : (
          <p className="font-medium text-gray-600">
            Fermé{pressing.ferme_a ? ` — dernière fermeture à ${formatHeure(pressing.ferme_a)}` : ''}
          </p>
        )}
        <p className="mt-0.5 text-xs text-gray-500">
          Le pressing s’ouvre automatiquement quand un agent se connecte, et se ferme à sa
          déconnexion.
        </p>
      </Card>

      {/* Chiffres du jour */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="text-center">
          <p className="text-lg font-bold text-pressci-dark">
            {chargementResumes ? '…' : resume?.tickets_actifs ?? 0}
          </p>
          <p className="text-xs text-gray-500">Tickets actifs</p>
        </Card>
        <Card className="text-center">
          <p className="text-lg font-bold text-pressci-dark">
            {chargementResumes ? '…' : resume?.depots_jour ?? 0}
          </p>
          <p className="text-xs text-gray-500">Dépôts aujourd’hui</p>
        </Card>
        <Card className="text-center">
          <p className="text-lg font-bold text-green-700">
            {chargementResumes ? '…' : formatFCFA(resume?.ca_jour ?? 0)}
          </p>
          <p className="text-xs text-gray-500">CA aujourd’hui</p>
        </Card>
        <Card className="text-center">
          <p className="text-lg font-bold text-orange-600">
            {chargementResumes ? '…' : formatFCFA(resume?.creances ?? 0)}
          </p>
          <p className="text-xs text-gray-500">Créances</p>
        </Card>
      </div>

      {/* Total encaissé par période */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-700">Total encaissé</h2>
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {PERIODES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodeActive(p.id)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  periodeActive === p.id
                    ? 'bg-pressci-primary text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-3xl font-bold text-pressci-primary">
          {chargementTotal ? '…' : formatFCFA(totalPeriode ?? 0)}
        </p>
      </Card>

      {/* Travailler dans ce pressing : ouvre ses tickets filtrés */}
      <Button pleineLargeur onClick={() => router.push(`/tickets?pressing=${pressing.id}`)}>
        → Travailler dans ce pressing
      </Button>

      {/* Coordonnées + modification */}
      <Card className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Coordonnées</h2>
          {role === 'proprietaire' && !edition && (
            <button
              type="button"
              onClick={() => {
                setNom(pressing.nom)
                setTelephone(pressing.telephone ?? '')
                setAdresse(pressing.adresse ?? '')
                setCommune(pressing.commune ?? '')
                setEdition(true)
              }}
              className="text-sm font-semibold text-pressci-primary"
            >
              ✏️ Modifier
            </button>
          )}
        </div>

        {!edition ? (
          <>
            <p>📍 {[pressing.adresse, pressing.commune].filter(Boolean).join(', ') || '—'}</p>
            <p>📞 {pressing.telephone ?? '—'}</p>
          </>
        ) : (
          <div className="space-y-3 pt-1">
            <Input label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
            <Input
              label="Téléphone"
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
            />
            <Input label="Adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
            <div>
              <label htmlFor="commune" className="mb-1 block text-sm font-medium text-gray-700">
                Commune
              </label>
              <select
                id="commune"
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                className="w-full rounded-card border border-gray-300 bg-white px-3 py-3 outline-none focus:border-pressci-primary"
              >
                <option value="">Choisir…</option>
                {COMMUNES_ABIDJAN.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {erreurEdition && (
              <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">
                {erreurEdition}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                chargement={sauvegarde}
                onClick={() => {
                  void (async () => {
                    if (nom.trim().length < 2) {
                      setErreurEdition('Entrez le nom du pressing.')
                      return
                    }
                    setSauvegarde(true)
                    setErreurEdition(null)
                    const supabase = createClient()
                    const { error } = await supabase
                      .from('pressings')
                      .update({
                        nom: nom.trim(),
                        telephone: telephone.trim() || null,
                        adresse: adresse.trim() || null,
                        commune: commune || null,
                      })
                      .eq('id', pressing.id)
                    setSauvegarde(false)
                    if (error) {
                      setErreurEdition('La sauvegarde a échoué. Réessayez.')
                      return
                    }
                    setEdition(false)
                    recharger()
                  })()
                }}
              >
                Enregistrer
              </Button>
              <Button variante="ghost" className="flex-1" onClick={() => setEdition(false)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Gestion des agents — propriétaire uniquement */}
      {role === 'proprietaire' && <GestionAgents pressingId={pressing.id} />}
    </div>
  )
}
