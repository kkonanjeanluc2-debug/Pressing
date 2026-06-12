import { createAdminClient, createClient } from '@/lib/supabase/server'
import { emailAgent, normaliserTelephone, validerTelephone } from '@/lib/utils'
import { PERMISSIONS_DEFAUT, type PermissionsAgent } from '@/types'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Gestion des agents d'un pressing — réservée au PROPRIÉTAIRE.
 * Le compte auth de l'agent est créé avec un email synthétique dérivé
 * du téléphone : l'agent se connecte avec téléphone + mot de passe.
 */

interface CorpsCreation {
  pressing_id?: string
  nom?: string
  telephone?: string
  mot_de_passe?: string
  permissions?: Partial<PermissionsAgent>
}

interface CorpsModification {
  agent_id?: string
  actif?: boolean
  permissions?: Partial<PermissionsAgent>
  mot_de_passe?: string
  nom?: string
  telephone?: string
}

/** Nettoie l'objet permissions reçu (uniquement les clés connues, en booléens). */
function nettoyerPermissions(brut: Partial<PermissionsAgent> | undefined): PermissionsAgent {
  const resultat = { ...PERMISSIONS_DEFAUT }
  if (!brut) return resultat
  for (const cle of Object.keys(PERMISSIONS_DEFAUT) as Array<keyof PermissionsAgent>) {
    if (typeof brut[cle] === 'boolean') resultat[cle] = brut[cle] as boolean
  }
  return resultat
}

/** Vérifie que l'utilisateur connecté est propriétaire du pressing. */
async function verifierProprietaire(
  pressingId: string
): Promise<{ userId: string } | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('pressings')
    .select('id')
    .eq('id', pressingId)
    .eq('owner_id', user.id)
    .maybeSingle()

  return data ? { userId: user.id } : null
}

// ---------------------------------------------------------------
// POST : créer un agent (compte auth + fiche agent)
// ---------------------------------------------------------------
export async function POST(request: NextRequest): Promise<NextResponse> {
  let corps: CorpsCreation
  try {
    corps = (await request.json()) as CorpsCreation
  } catch {
    return NextResponse.json({ succes: false, erreur: 'Requête invalide' }, { status: 400 })
  }

  if (!corps.pressing_id || !corps.nom || !corps.telephone || !corps.mot_de_passe) {
    return NextResponse.json({ succes: false, erreur: 'Champs manquants' }, { status: 400 })
  }
  if (corps.nom.trim().length < 2) {
    return NextResponse.json({ succes: false, erreur: "Entrez le nom de l'agent" }, { status: 400 })
  }
  if (!validerTelephone(corps.telephone)) {
    return NextResponse.json(
      { succes: false, erreur: 'Le numéro doit avoir 10 chiffres (ex : 07 07 07 07 07)' },
      { status: 400 }
    )
  }
  if (corps.mot_de_passe.length < 6) {
    return NextResponse.json(
      { succes: false, erreur: 'Le mot de passe doit faire au moins 6 caractères' },
      { status: 400 }
    )
  }

  const proprietaire = await verifierProprietaire(corps.pressing_id)
  if (!proprietaire) {
    return NextResponse.json({ succes: false, erreur: 'Accès refusé' }, { status: 403 })
  }

  const telephone = normaliserTelephone(corps.telephone)
  const admin = createAdminClient()

  // 1. Compte auth de l'agent (email synthétique dérivé du téléphone)
  const { data: nouvelUtilisateur, error: erreurAuth } = await admin.auth.admin.createUser({
    email: emailAgent(telephone),
    password: corps.mot_de_passe,
    email_confirm: true,
    user_metadata: { role: 'agent', nom: corps.nom.trim(), telephone },
  })

  if (erreurAuth || !nouvelUtilisateur.user) {
    const dejaPris =
      erreurAuth?.message.toLowerCase().includes('already') ??
      erreurAuth?.message.toLowerCase().includes('registered')
    return NextResponse.json(
      {
        succes: false,
        erreur: dejaPris
          ? 'Ce numéro a déjà un accès agent. Utilisez un autre numéro.'
          : "La création du compte agent a échoué. Réessayez.",
      },
      { status: 409 }
    )
  }

  // 2. Fiche agent
  const { data: agent, error: erreurAgent } = await admin
    .from('agents')
    .insert({
      pressing_id: corps.pressing_id,
      user_id: nouvelUtilisateur.user.id,
      nom: corps.nom.trim(),
      telephone,
      permissions: nettoyerPermissions(corps.permissions),
    })
    .select('*')
    .single()

  if (erreurAgent || !agent) {
    // rollback du compte auth pour ne pas laisser un compte orphelin
    await admin.auth.admin.deleteUser(nouvelUtilisateur.user.id)
    return NextResponse.json(
      { succes: false, erreur: "L'enregistrement de l'agent a échoué. Réessayez." },
      { status: 500 }
    )
  }

  return NextResponse.json({ succes: true, agent })
}

// ---------------------------------------------------------------
// PATCH : modifier un agent (permissions, actif, mot de passe)
// ---------------------------------------------------------------
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  let corps: CorpsModification
  try {
    corps = (await request.json()) as CorpsModification
  } catch {
    return NextResponse.json({ succes: false, erreur: 'Requête invalide' }, { status: 400 })
  }
  if (!corps.agent_id) {
    return NextResponse.json({ succes: false, erreur: 'agent_id manquant' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: agent } = await admin
    .from('agents')
    .select('id, user_id, pressing_id, permissions')
    .eq('id', corps.agent_id)
    .maybeSingle()

  if (!agent) {
    return NextResponse.json({ succes: false, erreur: 'Agent introuvable' }, { status: 404 })
  }

  const proprietaire = await verifierProprietaire(agent.pressing_id as string)
  if (!proprietaire) {
    return NextResponse.json({ succes: false, erreur: 'Accès refusé' }, { status: 403 })
  }

  const maj: Record<string, unknown> = {}
  if (typeof corps.actif === 'boolean') maj.actif = corps.actif

  if (typeof corps.nom === 'string') {
    if (corps.nom.trim().length < 2) {
      return NextResponse.json({ succes: false, erreur: "Entrez le nom de l'agent" }, { status: 400 })
    }
    maj.nom = corps.nom.trim()
  }

  // Le téléphone est l'identifiant de connexion : son changement
  // met aussi à jour l'email technique du compte auth.
  let nouveauTelephone: string | null = null
  if (typeof corps.telephone === 'string') {
    if (!validerTelephone(corps.telephone)) {
      return NextResponse.json(
        { succes: false, erreur: 'Le numéro doit avoir 10 chiffres (ex : 07 07 07 07 07)' },
        { status: 400 }
      )
    }
    nouveauTelephone = normaliserTelephone(corps.telephone)
    maj.telephone = nouveauTelephone
  }

  if (corps.permissions) {
    maj.permissions = {
      ...nettoyerPermissions(agent.permissions as Partial<PermissionsAgent>),
      ...Object.fromEntries(
        Object.entries(corps.permissions).filter(
          ([cle, v]) => cle in PERMISSIONS_DEFAUT && typeof v === 'boolean'
        )
      ),
    }
  }

  if (corps.mot_de_passe && corps.mot_de_passe.length < 6) {
    return NextResponse.json(
      { succes: false, erreur: 'Le mot de passe doit faire au moins 6 caractères' },
      { status: 400 }
    )
  }

  // 1. Mise à jour du compte auth (mot de passe, identifiant, métadonnées)
  const majAuth: { password?: string; email?: string; user_metadata?: Record<string, unknown> } = {}
  if (corps.mot_de_passe) majAuth.password = corps.mot_de_passe
  if (nouveauTelephone) majAuth.email = emailAgent(nouveauTelephone)
  if (maj.nom || nouveauTelephone) {
    majAuth.user_metadata = {
      ...(maj.nom ? { nom: maj.nom } : {}),
      ...(nouveauTelephone ? { telephone: nouveauTelephone } : {}),
    }
  }
  if (Object.keys(majAuth).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(agent.user_id as string, majAuth)
    if (error) {
      const dejaPris = error.message.toLowerCase().includes('already')
      return NextResponse.json(
        {
          succes: false,
          erreur: dejaPris
            ? 'Ce numéro est déjà utilisé par un autre accès agent.'
            : 'La mise à jour du compte agent a échoué.',
        },
        { status: dejaPris ? 409 : 500 }
      )
    }
  }

  // 2. Mise à jour de la fiche agent
  if (Object.keys(maj).length > 0) {
    const { error } = await admin.from('agents').update(maj).eq('id', corps.agent_id)
    if (error) {
      return NextResponse.json(
        {
          succes: false,
          erreur:
            error.code === '23505'
              ? 'Ce numéro est déjà utilisé par un autre agent de ce pressing.'
              : 'Mise à jour échouée',
        },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ succes: true })
}

// ---------------------------------------------------------------
// DELETE : supprimer un agent (compte auth + fiche, en cascade)
// ---------------------------------------------------------------
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const agentId = request.nextUrl.searchParams.get('id')
  if (!agentId) {
    return NextResponse.json({ succes: false, erreur: 'id manquant' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: agent } = await admin
    .from('agents')
    .select('id, user_id, pressing_id')
    .eq('id', agentId)
    .maybeSingle()

  if (!agent) {
    return NextResponse.json({ succes: false, erreur: 'Agent introuvable' }, { status: 404 })
  }

  const proprietaire = await verifierProprietaire(agent.pressing_id as string)
  if (!proprietaire) {
    return NextResponse.json({ succes: false, erreur: 'Accès refusé' }, { status: 403 })
  }

  // Supprimer le compte auth supprime la fiche agent (FK on delete cascade)
  const { error } = await admin.auth.admin.deleteUser(agent.user_id as string)
  if (error) {
    return NextResponse.json({ succes: false, erreur: 'Suppression échouée' }, { status: 500 })
  }

  return NextResponse.json({ succes: true })
}
