import { formatDate, formatFCFA } from '@/lib/utils'
import type { AbonnementClient, Client, Pressing } from '@/types'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const VERT_FONCE: [number, number, number] = [8, 80, 65]
const VERT: [number, number, number] = [15, 110, 86]
const VERT_CLAIR: [number, number, number] = [159, 225, 203]
const VERT_PALE: [number, number, number] = [225, 245, 238]

export function genererAbonnementPdf(
  abo: AbonnementClient,
  client: Client,
  pressing: Pressing
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // ---- En-tête ----
  doc.setFillColor(...VERT_FONCE)
  doc.rect(0, 0, 210, 44, 'F')

  doc.setFillColor(...VERT_CLAIR)
  doc.roundedRect(12, 8, 12, 12, 2, 2, 'F')
  doc.setTextColor(...VERT_FONCE)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('P', 18, 16.5, { align: 'center' })

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

  doc.setTextColor(...VERT_CLAIR)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text("REÇU D'ABONNEMENT", 198, 14, { align: 'right' })
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Émis le ${formatDate(new Date())}`, 198, 21, { align: 'right' })

  // Bande accent
  doc.setFillColor(...VERT_CLAIR)
  doc.rect(0, 45, 210, 2, 'F')

  // ---- Client ----
  let y = 59
  doc.setTextColor(150)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENT', 12, y)
  doc.setTextColor(20)
  doc.setFontSize(13)
  doc.text(client.nom, 12, y + 6.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(80)
  doc.text(client.telephone, 12, y + 12)

  // ---- Tableau abonnement ----
  y += 26
  autoTable(doc, {
    startY: y,
    head: [['Détail', 'Valeur']],
    body: [
      ['Formule', abo.nom_formule],
      ['Quota vêtements', `${abo.quota_vetements} pièce${abo.quota_vetements > 1 ? 's' : ''}`],
      ['Date de début', formatDate(abo.date_debut)],
      ['Date de fin (30 jours)', formatDate(abo.date_fin)],
      ['Montant', abo.prix > 0 ? formatFCFA(abo.prix) : 'Offert'],
    ],
    headStyles: { fillColor: VERT, fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right' },
    },
    styles: { fontSize: 10, cellPadding: 3 },
    alternateRowStyles: { fillColor: [245, 250, 248] },
    margin: { left: 12, right: 12 },
  })

  const yT =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40

  // ---- Total ----
  if (abo.prix > 0) {
    doc.setFillColor(...VERT_CLAIR)
    doc.roundedRect(118, yT + 6, 80, 10, 1.5, 1.5, 'F')
    doc.setTextColor(...VERT_FONCE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('MONTANT PAYÉ', 122, yT + 12.5)
    doc.text(formatFCFA(abo.prix), 194, yT + 12.5, { align: 'right' })
  }

  // ---- Conditions ----
  const yC = yT + 26
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80)
  doc.text(
    "Cet abonnement couvre les dépôts de vêtements jusqu'à épuisement du quota ou expiration de la période.",
    12,
    yC,
    { maxWidth: 186 }
  )

  // ---- Pied de page ----
  doc.setFontSize(9)
  doc.setTextColor(...VERT_FONCE)
  doc.setFont('helvetica', 'bold')
  doc.text('Merci de votre confiance !', 105, 282, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text('Document généré par Pressing Ivoire', 105, 287, { align: 'center' })

  return doc
}
