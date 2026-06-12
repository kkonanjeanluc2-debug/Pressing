'use client'

import GestionAgents from '@/components/pressings/GestionAgents'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { changerPressingActif, usePressing } from '@/hooks/usePressing'
import { usePressingsResume } from '@/hooks/usePressingsResume'
import { useProfil } from '@/hooks/useProfil'
import { formatFCFA } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function PressingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { pressing: pressingActif, pressings, chargement } = usePressing()
  const { role } = useProfil()
  const { resumes, chargement: chargementResumes } = usePressingsResume(pressings)

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
  const estActif = pressingActif?.id === pressing.id

  function travaillerDedans() {
    changerPressingActif(pressing!.id)
    router.push('/tickets')
  }

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
        {estActif && (
          <span className="shrink-0 rounded-full bg-pressci-primary px-2.5 py-1 text-[10px] font-bold text-white">
            ACTIF
          </span>
        )}
      </header>

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

      {/* Travailler dans ce pressing : il devient le pressing actif
          et toutes les pages (Tickets, Clients, Caisse…) basculent dessus */}
      <Button pleineLargeur onClick={travaillerDedans}>
        {estActif ? 'Ouvrir les tickets de ce pressing' : '→ Travailler dans ce pressing'}
      </Button>

      {/* Coordonnées */}
      <Card className="space-y-1 text-sm text-gray-600">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Coordonnées</h2>
        <p>📍 {[pressing.adresse, pressing.commune].filter(Boolean).join(', ') || '—'}</p>
        <p>📞 {pressing.telephone ?? '—'}</p>
        {role === 'proprietaire' && (
          <Link
            href="/parametres"
            onClick={() => changerPressingActif(pressing.id)}
            className="inline-block pt-1 text-sm font-semibold text-pressci-primary"
          >
            Modifier les informations →
          </Link>
        )}
      </Card>

      {/* Gestion des agents — propriétaire uniquement */}
      {role === 'proprietaire' && <GestionAgents pressingId={pressing.id} />}
    </div>
  )
}
