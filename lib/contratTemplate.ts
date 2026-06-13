/** Génère le texte par défaut du contrat de partenariat */
export function genererContratDefaut(partenaire: {
  nom: string
  type_compte: string
  email: string
  telephone?: string | null
  rccm?: string | null
  taux_commission: number
  code_parrainage: string
}): string {
  const dateAujourdhui = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const partieB =
    partenaire.type_compte === 'entreprise'
      ? `${partenaire.nom}${partenaire.rccm ? `, immatriculée au RCCM sous le numéro ${partenaire.rccm}` : ''}`
      : `M./Mme ${partenaire.nom}`

  return `CONTRAT DE PARTENARIAT COMMERCIAL

Fait à Abidjan, le ${dateAujourdhui}

ENTRE LES PARTIES :

D'une part,
La société PRESSING IVOIRE, éditrice de l'application de gestion de pressing éponyme,
ci-après dénommée « l'Éditeur » ;

Et d'autre part,
${partieB},
Email : ${partenaire.email}${partenaire.telephone ? `\nTéléphone : ${partenaire.telephone}` : ''},
ci-après dénommé(e) « le Partenaire » ;

Il a été convenu ce qui suit :

---

ARTICLE 1 — OBJET DU CONTRAT

Le présent contrat a pour objet de définir les conditions dans lesquelles le Partenaire s'engage à promouvoir et à commercialiser l'application Pressing Ivoire auprès de gestionnaires de pressings en Côte d'Ivoire, en contrepartie d'une commission sur abonnement.

ARTICLE 2 — OBLIGATIONS DU PARTENAIRE

Le Partenaire s'engage à :

1. Promouvoir activement l'application Pressing Ivoire auprès de sa clientèle, de son réseau professionnel et de ses prospects ;
2. Utiliser uniquement les supports de communication fournis ou approuvés par l'Éditeur ;
3. Ne pas dénigrer les produits, services ou la réputation de l'Éditeur ;
4. Informer tout prospect de l'utilisation du code de parrainage qui lui est attribué lors de l'inscription ;
5. Signaler à l'Éditeur toute information susceptible d'affecter la relation commerciale.

ARTICLE 3 — OBLIGATIONS DE L'ÉDITEUR

L'Éditeur s'engage à :

1. Fournir au Partenaire les outils et informations nécessaires à la promotion de l'application ;
2. Verser au Partenaire les commissions dues selon les modalités prévues à l'article 4 ;
3. Maintenir accessible l'espace partenaire permettant le suivi des parrainages et du chiffre d'affaires généré.

ARTICLE 4 — RÉMUNÉRATION ET COMMISSIONS

En contrepartie de ses actions de commercialisation, le Partenaire percevra une commission de ${partenaire.taux_commission}% (${partenaire.taux_commission} pour cent) sur le montant hors taxes de chaque abonnement payant souscrit par un utilisateur ayant utilisé son code de parrainage lors de son inscription.

Les commissions sont calculées mensuellement et versées dans un délai de trente (30) jours suivant la clôture du mois.

Les abonnements gratuits ne donnent pas lieu à commission.

ARTICLE 5 — CODE DE PARRAINAGE

L'Éditeur attribue au Partenaire le code de parrainage unique : ${partenaire.code_parrainage.toUpperCase()}

Ce code est personnel et incessible. Le Partenaire s'engage à ne pas le communiquer à un tiers à des fins de fraude ou de manipulation du système de parrainage.

ARTICLE 6 — DURÉE ET RÉSILIATION

Le présent contrat est conclu pour une durée indéterminée à compter de la date de signature par les deux parties.

Chacune des parties peut mettre fin au contrat moyennant un préavis de trente (30) jours notifié par email. Les commissions acquises avant la résiliation restent dues.

ARTICLE 7 — CONFIDENTIALITÉ

Les parties s'engagent mutuellement à maintenir confidentielles toutes les informations échangées dans le cadre du présent partenariat, notamment les données commerciales, les tarifs et les informations techniques relatives à l'application.

ARTICLE 8 — PROPRIÉTÉ INTELLECTUELLE

Le présent contrat ne confère au Partenaire aucun droit de propriété intellectuelle sur l'application Pressing Ivoire, ses marques, logos ou tout autre élément protégeable appartenant à l'Éditeur.

ARTICLE 9 — DROIT APPLICABLE ET JURIDICTION

Le présent contrat est soumis au droit ivoirien. Tout litige relatif à son interprétation ou à son exécution sera soumis, à défaut d'accord amiable, aux juridictions compétentes d'Abidjan (Côte d'Ivoire).

---

Lu et approuvé par les deux parties.`
}
