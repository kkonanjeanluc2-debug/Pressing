'use client'

import Card from '@/components/ui/Card'
import { useEffect, useState } from 'react'

interface Partenaire {
  id: string
  nom: string
  signe_admin: boolean
  signe_admin_at: string | null
  signe_admin_nom: string | null
  signe_partenaire: boolean
  signe_partenaire_at: string | null
  signe_partenaire_nom: string | null
  contrat_contenu: string | null
}

function formatDateSignature(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function PartenaireContratPage() {
  const [partenaire, setPartenaire] = useState<Partenaire | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const [modalSignature, setModalSignature] = useState(false)
  const [nomSignature, setNomSignature] = useState('')
  const [signatEnCours, setSignatEnCours] = useState(false)
  const [erreurSignat, setErreurSignat] = useState<string | null>(null)

  useEffect(() => { void charger() }, [])

  async function charger() {
    setChargement(true)
    const res = await fetch('/api/partenaire/profil')
    const data = (await res.json()) as { succes: boolean; partenaire?: Partenaire; erreur?: string }
    if (data.succes && data.partenaire) {
      setPartenaire(data.partenaire)
    } else {
      setErreur(data.erreur ?? 'Impossible de charger le contrat.')
    }
    setChargement(false)
  }

  async function signerContrat() {
    if (!nomSignature.trim()) { setErreurSignat('Saisissez votre nom pour signer.'); return }
    setSignatEnCours(true)
    setErreurSignat(null)
    const res = await fetch('/api/partenaire/signer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom_signature: nomSignature }),
    })
    const data = (await res.json()) as { succes: boolean; erreur?: string }
    if (data.succes) {
      setModalSignature(false)
      void charger()
    } else {
      setErreurSignat(data.erreur ?? 'Erreur lors de la signature.')
    }
    setSignatEnCours(false)
  }

  if (chargement) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <span className="spinner spinner-dark h-8 w-8" />
      </div>
    )
  }

  if (erreur || !partenaire) {
    return (
      <div className="rounded-2xl bg-red-50 px-4 py-8 text-center">
        <p className="text-red-700">{erreur ?? 'Contrat introuvable.'}</p>
      </div>
    )
  }

  const verrouille = partenaire.signe_admin && partenaire.signe_partenaire
  const peutSigner = partenaire.signe_admin && !partenaire.signe_partenaire && !!partenaire.contrat_contenu

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Contrat de partenariat</h1>
        <p className="text-sm text-gray-500">
          {verrouille
            ? 'Signé par les deux parties — contrat en vigueur.'
            : partenaire.signe_admin
            ? "Signé par l'administrateur — en attente de votre signature."
            : "En attente de la signature de l'administrateur."}
        </p>
      </div>

      {/* Statut des signatures */}
      <Card className="p-5">
        <h2 className="mb-4 text-xs font-bold uppercase text-gray-400">Statut des signatures</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {partenaire.signe_admin ? (
            <div className="rounded-xl border-2 border-green-400 bg-green-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase text-gray-500">Pressing Ivoire (Administrateur)</p>
              <p className="mt-2 font-['Georgia',serif] text-xl italic text-gray-900">
                {partenaire.signe_admin_nom}
              </p>
              <p className="text-xs text-gray-400">{formatDateSignature(partenaire.signe_admin_at)}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-4 text-center">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">Pressing Ivoire</p>
                <p className="mt-2 text-sm text-gray-400">En attente de l&apos;administrateur</p>
              </div>
            </div>
          )}

          {partenaire.signe_partenaire ? (
            <div className="rounded-xl border-2 border-green-400 bg-green-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase text-gray-500">Le Partenaire</p>
              <p className="mt-2 font-['Georgia',serif] text-xl italic text-gray-900">
                {partenaire.signe_partenaire_nom}
              </p>
              <p className="text-xs text-gray-400">{formatDateSignature(partenaire.signe_partenaire_at)}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-4 text-center">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">Le Partenaire</p>
                {peutSigner ? (
                  <p className="mt-1 text-sm text-amber-600">Votre signature est attendue</p>
                ) : (
                  <p className="mt-1 text-sm text-gray-400">En attente</p>
                )}
              </div>
              {peutSigner && (
                <button
                  type="button"
                  onClick={() => { setNomSignature(''); setErreurSignat(null); setModalSignature(true) }}
                  className="rounded-full bg-pressci-primary px-4 py-2 text-sm font-bold text-white hover:bg-pressci-dark"
                >
                  Signer le contrat
                </button>
              )}
            </div>
          )}
        </div>

        {verrouille && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm font-semibold text-green-800">
              Contrat verrouillé — les deux parties ont signé. Ce document ne peut plus être modifié.
            </p>
          </div>
        )}
      </Card>

      {/* Contenu du contrat */}
      {partenaire.contrat_contenu ? (
        <Card className="p-5 lg:p-8">
          <div className="mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-sm font-bold text-gray-600">Document contractuel</h2>
          </div>
          <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-5 font-['Georgia',serif] text-sm leading-relaxed text-gray-800">
            {partenaire.contrat_contenu}
          </pre>
        </Card>
      ) : (
        <Card className="py-12 text-center">
          <p className="text-4xl">📄</p>
          <p className="mt-3 font-semibold text-gray-500">
            Le contrat est en cours de rédaction par l&apos;administrateur.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Vous pourrez le consulter et le signer dès qu&apos;il sera prêt.
          </p>
        </Card>
      )}

      {/* Modale de signature */}
      {modalSignature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-bold text-gray-900">Signer le contrat</h2>
            <p className="mb-4 text-sm text-gray-500">
              En signant, vous acceptez les termes du contrat de partenariat commercial.
              Cette action est définitive et irréversible.
            </p>

            <label className="mb-1 block text-xs font-medium text-gray-700">
              Votre nom complet (tel qu&apos;il apparaîtra sur le contrat)
            </label>
            <input
              type="text"
              value={nomSignature}
              onChange={(e) => setNomSignature(e.target.value)}
              placeholder={partenaire.nom}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-pressci-primary"
            />

            {nomSignature && (
              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-400">Aperçu de votre signature</p>
                <p className="mt-1 font-['Georgia',serif] text-xl italic text-gray-900">
                  {nomSignature}
                </p>
              </div>
            )}

            {erreurSignat && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{erreurSignat}</p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => void signerContrat()}
                disabled={signatEnCours || !nomSignature.trim()}
                className="flex-1 rounded-full bg-pressci-primary py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {signatEnCours ? 'Signature…' : 'Je signe'}
              </button>
              <button
                type="button"
                onClick={() => setModalSignature(false)}
                className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-semibold text-gray-600"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
