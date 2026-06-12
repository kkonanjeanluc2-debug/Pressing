import {
  formatDate,
  formatDateHeure,
  formatFCFA,
  formatHeure,
  MODE_PAIEMENT_LABELS,
  STATUT_LABELS,
} from '@/lib/utils'
import type { Pressing, ProfilProprietaire, Ticket } from '@/types'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const VERT_FONCE: [number, number, number] = [8, 80, 65]
const VERT: [number, number, number] = [15, 110, 86]
const VERT_CLAIR: [number, number, number] = [159, 225, 203]
const VERT_PALE: [number, number, number] = [225, 245, 238]

/**
 * Génère le ticket de dépôt en PDF A4 aux couleurs PressCI
 * (téléchargement direct et envoi WhatsApp).
 * Les informations du propriétaire (raison sociale, RCCM, NCC)
 * apparaissent dans l'en-tête quand le profil est renseigné.
 */
export function genererTicketPdf(
  ticket: Ticket,
  pressing: Pressing,
  proprietaire?: ProfilProprietaire | null
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const hauteurEntete = proprietaire ? 50 : 44

  // ---- En-tête vert foncé ----
  doc.setFillColor(...VERT_FONCE)
  doc.rect(0, 0, 210, hauteurEntete, 'F')

  doc.setFillColor(...VERT_CLAIR)
  doc.roundedRect(12, 8, 12, 12, 2, 2, 'F')
  doc.setTextColor(...VERT_FONCE)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('P', 18, 16.5, { align: 'center' })

  doc.setTextColor(...VERT_CLAIR)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('PressCI — Gestion de pressing', 28, 14)

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(pressing.nom, 12, 30)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...VERT_PALE)
  const adresse = [pressing.adresse, pressing.commune].filter(Boolean).join(', ')
  if (adresse) doc.text(adresse, 12, 35.5)
  if (pressing.telephone) doc.text(`Tél : ${pressing.telephone}`, 12, 40)

  // Identité légale du propriétaire (entreprise ou personne physique)
  if (proprietaire) {
    doc.setTextColor(...VERT_CLAIR)
    doc.setFontSize(8.5)
    const mentions = [
      proprietaire.nom,
      proprietaire.rccm ? `RCCM : ${proprietaire.rccm}` : null,
      proprietaire.ncc ? `NCC : ${proprietaire.ncc}` : null,
    ]
      .filter(Boolean)
      .join('  ·  ')
    doc.text(mentions, 12, 46)
  }

  doc.setTextColor(...VERT_CLAIR)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('TICKET DE DÉPÔT', 198, 14, { align: 'right' })
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.text(ticket.numero, 198, 24, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Édité le ${formatDate(new Date())} à ${formatHeure(new Date())}`, 198, 30, {
    align: 'right',
  })

  // Bande d'accent
  doc.setFillColor(...VERT_CLAIR)
  doc.rect(0, hauteurEntete + 1, 210, 2, 'F')

  // ---- Client et dates ----
  let y = hauteurEntete + 14
  doc.setTextColor(150)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENT', 12, y)
  doc.setTextColor(20)
  doc.setFontSize(13)
  doc.text(ticket.client?.nom ?? '', 12, y + 6.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(80)
  doc.text(ticket.client?.telephone ?? '', 12, y + 12)

  doc.setFontSize(9)
  doc.setTextColor(70)
  const lignesDates = [
    `Déposé le : ${formatDateHeure(ticket.date_depot)}`,
    `Retrait prévu : ${formatDate(ticket.date_prevue)}`,
    ...(ticket.date_recuperation
      ? [`Récupéré le : ${formatDateHeure(ticket.date_recuperation)}`]
      : []),
    `Statut : ${STATUT_LABELS[ticket.statut]}`,
  ]
  lignesDates.forEach((ligne, i) => doc.text(ligne, 198, y + i * 5, { align: 'right' }))

  // ---- Tableau des articles ----
  y += 22
  autoTable(doc, {
    startY: y,
    head: [['Article', 'Qté', 'Prix unitaire', 'Sous-total']],
    body: (ticket.articles ?? []).map((a) => [
      a.type_article,
      String(a.quantite),
      formatFCFA(a.prix_unitaire),
      formatFCFA(a.sous_total),
    ]),
    headStyles: { fillColor: VERT, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 40 },
    },
    styles: { fontSize: 10, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [245, 250, 248] },
    margin: { left: 12, right: 12 },
  })

  let yT =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30
  yT += 10

  // ---- Totaux ----
  doc.setFillColor(...VERT_CLAIR)
  doc.roundedRect(118, yT - 5.5, 80, 8.5, 1.5, 1.5, 'F')
  doc.setTextColor(...VERT_FONCE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('TOTAL', 122, yT)
  doc.text(formatFCFA(ticket.montant_total), 194, yT, { align: 'right' })

  yT += 9
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(70)
  doc.text('Payé', 122, yT)
  doc.text(formatFCFA(ticket.montant_paye), 194, yT, { align: 'right' })

  const reste = ticket.montant_total - ticket.montant_paye
  if (reste > 0 && ticket.statut !== 'annule') {
    yT += 6
    doc.setTextColor(200, 90, 0)
    doc.setFont('helvetica', 'bold')
    doc.text('Reste à payer', 122, yT)
    doc.text(formatFCFA(reste), 194, yT, { align: 'right' })
  }
  if (ticket.mode_paiement) {
    yT += 6
    doc.setTextColor(70)
    doc.setFont('helvetica', 'normal')
    doc.text(`Mode de paiement : ${MODE_PAIEMENT_LABELS[ticket.mode_paiement]}`, 122, yT)
  }

  if (ticket.notes) {
    yT += 12
    doc.setTextColor(90)
    doc.setFontSize(9)
    doc.text(`Note : ${ticket.notes}`, 12, yT, { maxWidth: 186 })
  }

  // ---- Pied de page ----
  doc.setFontSize(9)
  doc.setTextColor(...VERT_FONCE)
  doc.setFont('helvetica', 'bold')
  doc.text('Merci de votre confiance ! Présentez ce ticket au retrait de votre linge.', 105, 282, {
    align: 'center',
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text('Document généré par PressCI — Gestion de pressing', 105, 287, { align: 'center' })

  return doc
}
