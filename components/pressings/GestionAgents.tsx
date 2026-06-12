'use client'

import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { useDonneesCachees } from '@/hooks/useDonneesCachees'
import { createClient } from '@/lib/supabase/client'
import {
  PERMISSIONS_DEFAUT,
  PERMISSIONS_LABELS,
  type Agent,
  type PermissionsAgent,
} from '@/types'
import { useState } from 'react'

interface GestionAgentsProps {
  pressingId: string
}

interface ReponseApi {
  succes: boolean
  erreur?: string
}

/**
 * Section « Agents » de la page détail d'un pressing :
 * création (téléphone + mot de passe), permissions, suspension, suppression.
 */
export default function GestionAgents({ pressingId }: GestionAgentsProps) {
  const [formOuvert, setFormOuvert] = useState(false)
  const [agentOuvert, setAgentOuvert] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  // Formulaire de création
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [permissions, setPermissions] = useState<PermissionsAgent>({ ...PERMISSIONS_DEFAUT })

  // Modification d'un agent (nom, téléphone, mot de passe)
  const [editNom, setEditNom] = useState('')
  const [editTel, setEditTel] = useState('')
  const [editMdp, setEditMdp] = useState('')
  const [modifEnCours, setModifEnCours] = useState(false)

  const { donnees: agents, chargement, recharger } = useDonneesCachees<Agent[]>(
    `agents_${pressingId}`,
    async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('pressing_id', pressingId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Agent[]
    },
    'Impossible de charger les agents.'
  )

  async function creerAgent() {
    setErreur(null)
    setEnCours(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pressing_id: pressingId,
          nom,
          telephone,
          mot_de_passe: motDePasse,
          permissions,
        }),
      })
      const data = (await res.json()) as ReponseApi
      if (!data.succes) {
        setErreur(data.erreur ?? "La création de l'agent a échoué.")
      } else {
        setFormOuvert(false)
        setNom('')
        setTelephone('')
        setMotDePasse('')
        setPermissions({ ...PERMISSIONS_DEFAUT })
        await recharger()
      }
    } catch {
      setErreur('Vérifiez votre réseau et réessayez.')
    }
    setEnCours(false)
  }

  async function modifierAgent(
    agentId: string,
    maj: { actif?: boolean; permissions?: Partial<PermissionsAgent> }
  ) {
    setErreur(null)
    const res = await fetch('/api/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId, ...maj }),
    })
    const data = (await res.json()) as ReponseApi
    if (!data.succes) setErreur(data.erreur ?? 'La modification a échoué.')
    await recharger()
  }

  function basculerAgent(agent: Agent, dejaOuvert: boolean) {
    if (dejaOuvert) {
      setAgentOuvert(null)
      return
    }
    setEditNom(agent.nom)
    setEditTel(agent.telephone)
    setEditMdp('')
    setAgentOuvert(agent.id)
  }

  async function enregistrerModifications(agent: Agent) {
    setErreur(null)
    const corps: Record<string, unknown> = { agent_id: agent.id }
    if (editNom.trim() !== agent.nom) corps.nom = editNom
    if (editTel.trim() !== agent.telephone) corps.telephone = editTel
    if (editMdp) corps.mot_de_passe = editMdp
    if (Object.keys(corps).length === 1) return

    setModifEnCours(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corps),
      })
      const data = (await res.json()) as ReponseApi
      if (!data.succes) {
        setErreur(data.erreur ?? 'La modification a échoué.')
      } else {
        setEditMdp('')
        await recharger()
      }
    } catch {
      setErreur('Vérifiez votre réseau et réessayez.')
    }
    setModifEnCours(false)
  }

  async function supprimerAgent(agent: Agent) {
    if (!window.confirm(`Supprimer l'accès de ${agent.nom} ? Cette action est définitive.`)) return
    setErreur(null)
    const res = await fetch(`/api/agents?id=${agent.id}`, { method: 'DELETE' })
    const data = (await res.json()) as ReponseApi
    if (!data.succes) setErreur(data.erreur ?? 'La suppression a échoué.')
    await recharger()
  }

  const listeAgents = agents ?? []

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Agents ({listeAgents.length})
        </h2>
        <button
          type="button"
          onClick={() => setFormOuvert((o) => !o)}
          className="rounded-full bg-pressci-primary px-3 py-1.5 text-xs font-semibold text-white"
        >
          {formOuvert ? 'Fermer' : '+ Créer un agent'}
        </button>
      </div>

      {erreur && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {/* ---- Formulaire de création ---- */}
      {formOuvert && (
        <div className="space-y-3 rounded-card border border-pressci-accent bg-pressci-light/40 p-3">
          <Input
            label="Nom de l'agent"
            placeholder="Ex : Aya Koné"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
          <Input
            label="Téléphone (servira à se connecter)"
            type="tel"
            placeholder="07 07 07 07 07"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
          />
          <Input
            label="Mot de passe"
            type="text"
            placeholder="6 caractères minimum"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Permissions</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {(Object.keys(PERMISSIONS_LABELS) as Array<keyof PermissionsAgent>).map((cle) => (
                <label key={cle} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={permissions[cle]}
                    onChange={(e) =>
                      setPermissions((p) => ({ ...p, [cle]: e.target.checked }))
                    }
                    className="h-4 w-4 accent-pressci-primary"
                  />
                  {PERMISSIONS_LABELS[cle]}
                </label>
              ))}
            </div>
          </div>

          <Button pleineLargeur chargement={enCours} onClick={() => void creerAgent()}>
            Créer l'accès agent
          </Button>
          <p className="text-xs text-gray-500">
            L'agent se connectera sur la page de connexion avec son numéro de téléphone et ce
            mot de passe. Il ne verra que les données de ce pressing.
          </p>
        </div>
      )}

      {/* ---- Liste des agents ---- */}
      {chargement ? (
        <div className="flex justify-center py-4">
          <span className="spinner spinner-dark" />
        </div>
      ) : listeAgents.length === 0 ? (
        !formOuvert && (
          <p className="py-4 text-center text-sm text-gray-400">
            Aucun agent pour ce pressing. Créez un accès pour votre employé.
          </p>
        )
      ) : (
        <div className="space-y-2">
          {listeAgents.map((agent) => {
            const ouvert = agentOuvert === agent.id
            return (
              <div key={agent.id} className="rounded-card border border-gray-200">
                <button
                  type="button"
                  onClick={() => basculerAgent(agent, ouvert)}
                  className="flex w-full items-center justify-between gap-2 p-3 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pressci-light text-sm font-bold text-pressci-primary">
                      {agent.nom.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-800">{agent.nom}</p>
                      <p className="text-xs text-gray-500">{agent.telephone}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        agent.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {agent.actif ? 'Actif' : 'Suspendu'}
                    </span>
                    <span className="text-gray-400">{ouvert ? '▴' : '▾'}</span>
                  </div>
                </button>

                {ouvert && (
                  <div className="space-y-3 border-t border-gray-100 p-3">
                    {/* ---- Modifier l'agent ---- */}
                    <div className="space-y-2 rounded-card bg-gray-50 p-3">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        Modifier l'agent
                      </p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input
                          type="text"
                          value={editNom}
                          onChange={(e) => setEditNom(e.target.value)}
                          placeholder="Nom"
                          aria-label="Nom de l'agent"
                          className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
                        />
                        <input
                          type="tel"
                          value={editTel}
                          onChange={(e) => setEditTel(e.target.value)}
                          placeholder="Téléphone"
                          aria-label="Téléphone de l'agent"
                          className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
                        />
                        <input
                          type="text"
                          value={editMdp}
                          onChange={(e) => setEditMdp(e.target.value)}
                          placeholder="Nouveau mot de passe"
                          aria-label="Nouveau mot de passe"
                          className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm outline-none focus:border-pressci-primary"
                        />
                      </div>
                      <Button
                        className="min-h-[40px] w-full py-2 text-sm"
                        chargement={modifEnCours}
                        onClick={() => void enregistrerModifications(agent)}
                      >
                        Enregistrer les modifications
                      </Button>
                      <p className="text-[11px] text-gray-400">
                        Le téléphone sert d'identifiant : s'il change, l'agent se connectera avec
                        le nouveau numéro. Laissez le mot de passe vide pour ne pas le changer.
                      </p>
                    </div>

                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {(Object.keys(PERMISSIONS_LABELS) as Array<keyof PermissionsAgent>).map(
                        (cle) => (
                          <label
                            key={cle}
                            className="flex items-center gap-2 text-sm text-gray-700"
                          >
                            <input
                              type="checkbox"
                              checked={agent.permissions[cle] === true}
                              onChange={(e) =>
                                void modifierAgent(agent.id, {
                                  permissions: { [cle]: e.target.checked },
                                })
                              }
                              className="h-4 w-4 accent-pressci-primary"
                            />
                            {PERMISSIONS_LABELS[cle]}
                          </label>
                        )
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variante={agent.actif ? 'outline' : 'secondary'}
                        className="min-h-[40px] flex-1 py-2 text-sm"
                        onClick={() => void modifierAgent(agent.id, { actif: !agent.actif })}
                      >
                        {agent.actif ? 'Suspendre' : 'Réactiver'}
                      </Button>
                      <Button
                        variante="danger"
                        className="min-h-[40px] flex-1 py-2 text-sm"
                        onClick={() => void supprimerAgent(agent)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
