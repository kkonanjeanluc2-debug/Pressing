'use client'

import Card from '@/components/ui/Card'
import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { genererContratDefaut } from '@/lib/contratTemplate'
import { formatDateCourte } from '@/lib/utils'
import { useState } from 'react'
import type { PartenaireLigne } from '@/app/api/admin/partenaires/route'

const BADGE_STATUT: Record<string, string> = {
  actif: 'bg-green-100 text-green-700',
  suspendu: 'bg-red-100 text-red-600',
}

interface PartenaireAvecContrat extends PartenaireLigne {
  contrat_contenu?: string | null
  signe_admin?: boolean
  signe_admin_at?: string | null
  signe_admin_nom?: string | null
  signe_partenaire?: boolean
  signe_partenaire_at?: string | null
  signe_partenaire_nom?: string | null
}

function formatDateSignature(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminPartenairesPage() {
  const { donnees, chargement, erreur, recharger } = useDonneesCachees<PartenaireAvecContrat[]>(
    'admin_partenaires',
    async () => {
      const res = await fetch('/api/admin/partenaires')
      const data = (await res.json()) as { succes: boolean; partenaires?: PartenaireAvecContrat[] }
      if (!data.succes || !data.partenaires) throw new Error('refus')
      return data.partenaires
    },
    'Impossible de charger les partenaires.'
  )

  const partenaires = donnees ?? []

  /* ── Création ── */
  const [modaleCreation, setModaleCreation] = useState(false)
  const [form, setForm] = useState({
    nom: '',
    type_compte: 'personne' as 'personne' | 'entreprise',
    email: '',
    telephone: '',
    rccm: '',
    taux_commission: 10,
    notes: '',
  })
  const [creation, setCreation] = useState<{
    code_parrainage: string
    mdp_temporaire: string
    lien_connexion: string | null
  } | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [erreurForm, setErreurForm] = useState<string | null>(null)
  const [copie, setCopie] = useState<string | null>(null)

  function resetForm() {
    setForm({ nom: '', type_compte: 'personne', email: '', telephone: '', rccm: '', taux_commission: 10, notes: '' })
    setErreurForm(null)
    setCreation(null)
  }

  async function creerPartenaire() {
    if (!form.nom.trim() || !form.email.trim()) {
      setErreurForm('Nom et email sont obligatoires.')
      return
    }
    setEnCours(true)
    setErreurForm(null)
    const res = await fetch('/api/admin/partenaires', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = (await res.json()) as {
      succes: boolean; erreur?: string
      code_parrainage?: string; mdp_temporaire?: string; lien_connexion?: string | null
    }
    if (data.succes) {
      setCreation({
        code_parrainage: data.code_parrainage!,
        mdp_temporaire: data.mdp_temporaire!,
        lien_connexion: data.lien_connexion ?? null,
      })
      void recharger()
    } else {
      setErreurForm(data.erreur ?? 'Erreur inconnue.')
    }
    setEnCours(false)
  }

  async function copierTexte(texte: string, id: string) {
    await navigator.clipboard.writeText(texte)
    setCopie(id)
    setTimeout(() => setCopie(null), 2000)
  }

  /* ── Modifier statut / taux ── */
  const [modaleEdit, setModaleEdit] = useState<PartenaireAvecContrat | null>(null)
  const [editTaux, setEditTaux] = useState(10)
  const [editStatut, setEditStatut] = useState<'actif' | 'suspendu'>('actif')
  const [editNotes, setEditNotes] = useState('')
  const [editEnCours, setEditEnCours] = useState(false)

  async function sauvegarderEdit() {
    if (!modaleEdit) return
    setEditEnCours(true)
    await fetch('/api/admin/partenaires', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: modaleEdit.id, taux_commission: editTaux, statut: editStatut, notes: editNotes }),
    })
    setModaleEdit(null)
    void recharger()
    setEditEnCours(false)
  }

  /* ── Contrat ── */
  const [modaleContrat, setModaleContrat] = useState<PartenaireAvecContrat | null>(null)
  const [contratContenu, setContratContenu] = useState('')
  const [contratEnCours, setContratEnCours] = useState(false)
  const [contratErreur, setContratErreur] = useState<string | null>(null)
  const [contratSucces, setContratSucces] = useState<string | null>(null)
  const [ongletContrat, setOngletContrat] = useState<'edition' | 'signature'>('edition')
  const [nomAdmin, setNomAdmin] = useState('')

  function ouvrirContrat(p: PartenaireAvecContrat) {
    setModaleContrat(p)
    setContratContenu(p.contrat_contenu ?? genererContratDefaut(p))
    setContratErreur(null)
    setContratSucces(null)
    setOngletContrat(p.contrat_contenu ? 'signature' : 'edition')
    setNomAdmin('')
  }

  async function sauvegarderContrat() {
    if (!modaleContrat) return
    setContratEnCours(true)
    setContratErreur(null)
    setContratSucces(null)
    const res = await fetch('/api/admin/partenaires/contrat', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: modaleContrat.id, contrat_contenu: contratContenu }),
    })
    const data = (await res.json()) as { succes: boolean; erreur?: string }
    if (data.succes) {
      setContratSucces('Contrat sauvegardé.')
      void recharger()
    } else {
      setContratErreur(data.erreur ?? 'Erreur lors de la sauvegarde.')
    }
    setContratEnCours(false)
  }

  async function signerContratAdmin() {
    if (!modaleContrat || !nomAdmin.trim()) {
      setContratErreur('Saisissez votre nom pour signer.')
      return
    }
    setContratEnCours(true)
    setContratErreur(null)
    setContratSucces(null)
    const res = await fetch('/api/admin/partenaires/contrat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: modaleContrat.id, nom_admin: nomAdmin }),
    })
    const data = (await res.json()) as { succes: boolean; erreur?: string }
    if (data.succes) {
      setContratSucces('Contrat signé par l\'administrateur.')
      void recharger()
      setModaleContrat(null)
    } else {
      setContratErreur(data.erreur ?? 'Erreur lors de la signature.')
    }
    setContratEnCours(false)
  }

  const verrouille = (p: PartenaireAvecContrat) => !!p.signe_admin && !!p.signe_partenaire

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Partenaires</h1>
          <p className="text-sm text-gray-500">
            {partenaires.length} partenaire{partenaires.length > 1 ? 's' : ''} commercial{partenaires.length > 1 ? 'aux' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setModaleCreation(true) }}
          className="rounded-full bg-pressci-primary px-4 py-2 text-sm font-bold text-white hover:bg-pressci-dark"
        >
          + Nouveau partenaire
        </button>
      </header>

      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {chargement ? (
        <div className="flex justify-center py-10">
          <span className="spinner spinner-dark h-8 w-8" />
        </div>
      ) : partenaires.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="text-4xl">🤝</p>
          <p className="mt-3 font-semibold text-gray-600">Aucun partenaire pour l&apos;instant.</p>
          <p className="mt-1 text-sm text-gray-400">
            Créez des comptes partenaires pour commercialiser Pressing Ivoire avec commission.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-semibold">Partenaire</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 text-center font-semibold">Commission</th>
                <th className="px-4 py-3 text-center font-semibold">Contrat</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Depuis</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partenaires.map((p) => {
                const lock = verrouille(p)
                const contratStatut = lock
                  ? { label: 'Signé', cls: 'bg-green-100 text-green-700' }
                  : p.signe_admin
                  ? { label: 'En attente', cls: 'bg-amber-100 text-amber-700' }
                  : p.contrat_contenu
                  ? { label: 'Non signé', cls: 'bg-gray-100 text-gray-500' }
                  : { label: 'Sans contrat', cls: 'bg-gray-100 text-gray-400' }

                return (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                          {p.nom.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {p.type_compte === 'entreprise' ? '🏢 ' : '👤 '}{p.nom}
                          </p>
                          <p className="text-xs text-gray-400">
                            {p.type_compte === 'entreprise' ? 'Entreprise' : 'Personne physique'}
                            {p.rccm ? ` · ${p.rccm}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{p.email}</p>
                      <p className="text-xs text-gray-400">{p.telephone ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-pressci-primary">
                          {p.code_parrainage}
                        </span>
                        <button
                          type="button"
                          onClick={() => void copierTexte(p.code_parrainage, `code-${p.id}`)}
                          className="text-xs text-gray-400 hover:text-gray-700"
                        >
                          {copie === `code-${p.id}` ? '✓' : '📋'}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-sm font-bold text-amber-700">
                        {p.taux_commission}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => ouvrirContrat(p)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${contratStatut.cls}`}
                      >
                        {contratStatut.label}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_STATUT[p.statut] ?? ''}`}>
                        {p.statut === 'actif' ? 'Actif' : 'Suspendu'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDateCourte(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setModaleEdit(p)
                          setEditTaux(p.taux_commission)
                          setEditStatut(p.statut as 'actif' | 'suspendu')
                          setEditNotes(p.notes ?? '')
                        }}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:border-pressci-primary hover:text-pressci-primary"
                      >
                        ✏️ Modifier
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* ════ Modale création ════ */}
      {modaleCreation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            {!creation ? (
              <>
                <h2 className="mb-4 text-lg font-bold text-gray-900">Nouveau partenaire</h2>
                <div className="mb-4 grid grid-cols-2 gap-2">
                  {(['personne', 'entreprise'] as const).map((t) => (
                    <button key={t} type="button"
                      onClick={() => setForm((f) => ({ ...f, type_compte: t }))}
                      className={`rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${form.type_compte === t ? 'border-pressci-primary bg-pressci-light text-pressci-primary' : 'border-gray-200 text-gray-500'}`}
                    >
                      {t === 'personne' ? '👤 Personne physique' : '🏢 Entreprise'}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        {form.type_compte === 'entreprise' ? 'Raison sociale *' : 'Nom complet *'}
                      </label>
                      <input type="text" value={form.nom}
                        onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Email *</label>
                      <input type="email" value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Téléphone</label>
                      <input type="tel" value={form.telephone}
                        onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
                      />
                    </div>
                    {form.type_compte === 'entreprise' && (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">N° RCCM</label>
                        <input type="text" value={form.rccm}
                          onChange={(e) => setForm((f) => ({ ...f, rccm: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Taux de commission (%)</label>
                    <div className="flex items-center gap-3">
                      <input type="range" min={0} max={50} step={1} value={form.taux_commission}
                        onChange={(e) => setForm((f) => ({ ...f, taux_commission: Number(e.target.value) }))}
                        className="flex-1 accent-pressci-primary"
                      />
                      <span className="w-14 rounded-lg border border-gray-300 py-1 text-center text-sm font-bold text-pressci-primary">
                        {form.taux_commission}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Notes internes</label>
                    <textarea value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
                    />
                  </div>
                </div>
                {erreurForm && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{erreurForm}</p>
                )}
                <div className="mt-5 flex gap-2">
                  <button type="button" onClick={() => void creerPartenaire()} disabled={enCours}
                    className="flex-1 rounded-full bg-pressci-primary py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {enCours ? 'Création…' : 'Créer le compte'}
                  </button>
                  <button type="button" onClick={() => { setModaleCreation(false); resetForm() }}
                    className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-gray-600"
                  >
                    Annuler
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 text-center">
                  <span className="text-4xl">🤝</span>
                  <h2 className="mt-2 text-lg font-bold text-gray-900">Partenaire créé !</h2>
                  <p className="text-sm text-gray-500">Transmettez ces informations au partenaire de façon sécurisée.</p>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Code parrainage</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-lg font-bold text-pressci-primary">{creation.code_parrainage}</span>
                      <button type="button" onClick={() => void copierTexte(creation.code_parrainage, 'code')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${copie === 'code' ? 'bg-green-100 text-green-700' : 'bg-pressci-primary text-white'}`}
                      >
                        {copie === 'code' ? '✓ Copié' : 'Copier'}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-orange-500">Mot de passe temporaire</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-orange-700">{creation.mdp_temporaire}</span>
                      <button type="button" onClick={() => void copierTexte(creation.mdp_temporaire, 'mdp')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${copie === 'mdp' ? 'bg-green-100 text-green-700' : 'bg-orange-500 text-white'}`}
                      >
                        {copie === 'mdp' ? '✓ Copié' : 'Copier'}
                      </button>
                    </div>
                  </div>
                  {creation.lien_connexion && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                      <p className="mb-1 text-xs font-semibold uppercase text-blue-500">Lien de connexion direct</p>
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate font-mono text-xs text-blue-700">{creation.lien_connexion}</span>
                        <button type="button" onClick={() => void copierTexte(creation.lien_connexion!, 'lien')}
                          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${copie === 'lien' ? 'bg-green-100 text-green-700' : 'bg-blue-500 text-white'}`}
                        >
                          {copie === 'lien' ? '✓ Copié' : 'Copier'}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
                    <p className="font-semibold">Prochaine étape : rédiger le contrat</p>
                    <p className="text-xs text-violet-600">
                      Cliquez sur le statut &quot;Sans contrat&quot; dans la liste pour rédiger et signer le contrat de partenariat.
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => { setModaleCreation(false); resetForm() }}
                  className="mt-5 w-full rounded-full bg-pressci-primary py-2.5 text-sm font-bold text-white"
                >
                  Terminé
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════ Modale édition ════ */}
      {modaleEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-bold text-gray-900">Modifier le partenaire</h2>
            <p className="mb-4 text-sm font-semibold text-gray-500">{modaleEdit.nom}</p>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Taux de commission (%)</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={50} step={1} value={editTaux}
                    onChange={(e) => setEditTaux(Number(e.target.value))}
                    className="flex-1 accent-pressci-primary"
                  />
                  <span className="w-14 rounded-lg border border-gray-300 py-1 text-center text-sm font-bold text-pressci-primary">
                    {editTaux}%
                  </span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Statut</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['actif', 'suspendu'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setEditStatut(s)}
                      className={`rounded-xl border-2 py-2 text-sm font-semibold transition-all ${editStatut === s ? s === 'actif' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-600' : 'border-gray-200 text-gray-500'}`}
                    >
                      {s === 'actif' ? '✓ Actif' : '⏸ Suspendu'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Notes internes</label>
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => void sauvegarderEdit()} disabled={editEnCours}
                className="flex-1 rounded-full bg-pressci-primary py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {editEnCours ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button type="button" onClick={() => setModaleEdit(null)}
                className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-gray-600"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Modale contrat ════ */}
      {modaleContrat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl" style={{ maxHeight: '90vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Contrat de partenariat</h2>
                <p className="text-sm font-semibold text-gray-500">{modaleContrat.nom}</p>
              </div>
              <button type="button" onClick={() => setModaleContrat(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Onglets */}
            {!verrouille(modaleContrat) && (
              <div className="flex border-b border-gray-200 px-6">
                {(['edition', 'signature'] as const).map((o) => (
                  <button key={o} type="button" onClick={() => setOngletContrat(o)}
                    className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${ongletContrat === o ? 'border-pressci-primary text-pressci-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    {o === 'edition' ? '📝 Rédaction' : '✍️ Signature admin'}
                  </button>
                ))}
              </div>
            )}

            {/* Corps */}
            <div className="flex-1 overflow-y-auto p-6">
              {verrouille(modaleContrat) ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <p className="text-sm font-semibold text-green-800">Contrat verrouillé — signé par les deux parties.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border-2 border-green-400 bg-green-50 p-3 text-center">
                      <p className="text-xs font-semibold uppercase text-gray-500">Pressing Ivoire</p>
                      <p className="mt-1 font-['Georgia',serif] text-lg italic text-gray-900">{modaleContrat.signe_admin_nom}</p>
                      <p className="text-xs text-gray-400">{formatDateSignature(modaleContrat.signe_admin_at)}</p>
                    </div>
                    <div className="rounded-xl border-2 border-green-400 bg-green-50 p-3 text-center">
                      <p className="text-xs font-semibold uppercase text-gray-500">Le Partenaire</p>
                      <p className="mt-1 font-['Georgia',serif] text-lg italic text-gray-900">{modaleContrat.signe_partenaire_nom}</p>
                      <p className="text-xs text-gray-400">{formatDateSignature(modaleContrat.signe_partenaire_at)}</p>
                    </div>
                  </div>
                  <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-700">
                    {modaleContrat.contrat_contenu}
                  </pre>
                </div>
              ) : ongletContrat === 'edition' ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Rédigez ou modifiez le contrat. Le modèle par défaut est pré-rempli avec les informations du partenaire.
                    {modaleContrat.signe_admin && (
                      <span className="ml-1 font-semibold text-amber-600">
                        ⚠️ L&apos;admin a déjà signé — toute modification annulera la signature.
                      </span>
                    )}
                  </p>
                  <textarea
                    value={contratContenu}
                    onChange={(e) => setContratContenu(e.target.value)}
                    rows={20}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-xs leading-relaxed text-gray-800 outline-none focus:border-pressci-primary focus:bg-white"
                  />
                  {contratErreur && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{contratErreur}</p>
                  )}
                  {contratSucces && (
                    <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">{contratSucces}</p>
                  )}
                  <button type="button" onClick={() => void sauvegarderContrat()} disabled={contratEnCours}
                    className="w-full rounded-full bg-pressci-primary py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {contratEnCours ? 'Sauvegarde…' : 'Sauvegarder le contrat'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {modaleContrat.signe_admin ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border-2 border-green-400 bg-green-50 p-4 text-center">
                        <p className="text-xs font-semibold uppercase text-gray-500">Signé par Pressing Ivoire</p>
                        <p className="mt-2 font-['Georgia',serif] text-xl italic text-gray-900">{modaleContrat.signe_admin_nom}</p>
                        <p className="text-xs text-gray-400">{formatDateSignature(modaleContrat.signe_admin_at)}</p>
                      </div>
                      {modaleContrat.signe_partenaire ? (
                        <div className="rounded-xl border-2 border-green-400 bg-green-50 p-4 text-center">
                          <p className="text-xs font-semibold uppercase text-gray-500">Signé par le Partenaire</p>
                          <p className="mt-2 font-['Georgia',serif] text-xl italic text-gray-900">{modaleContrat.signe_partenaire_nom}</p>
                          <p className="text-xs text-gray-400">{formatDateSignature(modaleContrat.signe_partenaire_at)}</p>
                        </div>
                      ) : (
                        <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 text-center">
                          <p className="text-xs font-semibold uppercase text-gray-400">En attente de la signature du partenaire</p>
                          <p className="mt-1 text-sm text-gray-500">
                            Le partenaire peut signer depuis son espace partenaire.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {!modaleContrat.contrat_contenu && (
                        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                          ⚠️ Rédigez et sauvegardez le contrat dans l&apos;onglet &quot;Rédaction&quot; avant de le signer.
                        </div>
                      )}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">
                          Votre nom (tel qu&apos;il apparaîtra sur le contrat)
                        </label>
                        <input type="text" value={nomAdmin}
                          onChange={(e) => setNomAdmin(e.target.value)}
                          placeholder="Prénom NOM"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-pressci-primary"
                        />
                      </div>
                      {nomAdmin && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                          <p className="text-xs text-gray-400">Aperçu de la signature</p>
                          <p className="mt-1 font-['Georgia',serif] text-xl italic text-gray-900">{nomAdmin}</p>
                        </div>
                      )}
                      {contratErreur && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{contratErreur}</p>
                      )}
                      <button type="button"
                        onClick={() => void signerContratAdmin()}
                        disabled={contratEnCours || !nomAdmin.trim() || !modaleContrat.contrat_contenu}
                        className="w-full rounded-full bg-pressci-primary py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {contratEnCours ? 'Signature…' : 'Signer le contrat en tant qu\'administrateur'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
