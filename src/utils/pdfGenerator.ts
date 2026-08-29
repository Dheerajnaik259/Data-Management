import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client, Cameraman, Shoot } from '../types';
import { formatCurrency } from './formatCurrency';

export interface InvoiceOptions {
  invoiceNumber: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  paymentDetails?: string;
}

const DEFAULT_BIZ: Required<InvoiceOptions> = {
  invoiceNumber: 'INV-001',
  businessName: 'Business name not configured',
  businessEmail: 'Business email not configured',
  businessPhone: 'Business phone not configured',
  paymentDetails: 'Payment details not configured',
};

/**
 * Generates a clean, professional Client Invoice PDF
 */
export function generateClientInvoicePDF(
  client: Client,
  shoot: Shoot,
  options: Partial<InvoiceOptions> = {}
): jsPDF {
  const doc = new jsPDF();
  const opt = { ...DEFAULT_BIZ, ...options };
  const invNumber = opt.invoiceNumber || `INV-${shoot.date.replace(/-/g, '')}-${shoot.id.slice(0, 4).toUpperCase()}`;

  // Palette: Dark Charcoal (#1C1917), Terracotta Accent (#C85A32), Light Gray (#F5F5F4)
  // Header background banner
  doc.setFillColor(250, 248, 245);
  doc.rect(0, 0, 210, 42, 'F');

  // Business Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(28, 25, 23);
  doc.text(opt.businessName, 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 95, 90);
  doc.text(`Email: ${opt.businessEmail}  |  Phone: ${opt.businessPhone}`, 14, 25);
  doc.text('Visual Marketing & High-Conversion Promotional Content', 14, 31);

  // Top Right: Invoice Tag
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(200, 90, 50); // Terracotta
  doc.text('INVOICE', 196, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 65, 60);
  doc.text(`Invoice #: ${invNumber}`, 196, 26, { align: 'right' });
  doc.text(`Date: ${shoot.date}`, 196, 32, { align: 'right' });

  // Divider line
  doc.setDrawColor(229, 224, 218);
  doc.setLineWidth(0.5);
  doc.line(14, 44, 196, 44);

  // Bill To & Shoot Metadata Boxes
  let currentY = 54;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text('BILLED TO:', 14, currentY);
  doc.text('SHOOT DETAILS:', 110, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(client.name, 14, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 65, 60);
  doc.text(`Location: ${shoot.location}`, 110, currentY);

  currentY += 5;
  doc.text(`Phone: ${client.phone}`, 14, currentY);
  doc.text(`Shoot Date: ${shoot.date}`, 110, currentY);

  currentY += 5;
  if (client.contractLink) {
    doc.text(`Contract: ${client.contractLink}`, 14, currentY);
  }
  doc.text(`Status: ${shoot.status.toUpperCase()}`, 110, currentY);

  currentY += 12;

  // Deliverables Summary text
  const deliverablesSummary = shoot.deliverables && shoot.deliverables.length > 0
    ? shoot.deliverables.map((d) => `${d.count}x ${d.type}`).join(', ')
    : 'Full production package';

  // Table of Services
  const tableRows = [
    [
      `Commercial Video Production & Social Assets\nShoot Location: ${shoot.location}\nDeliverables: ${deliverablesSummary}`,
      '1 Service',
      formatCurrency(shoot.clientAmount),
      formatCurrency(shoot.clientAmount),
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Qty / Scope', 'Unit Rate', 'Amount']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [240, 236, 230],
      textColor: [28, 25, 23],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      textColor: [40, 35, 30],
      fontSize: 9,
      cellPadding: 6,
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 26, halign: 'right' },
    },
    styles: {
      lineColor: [229, 224, 218],
      lineWidth: 0.2,
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Totals Box
  doc.setFillColor(250, 248, 245);
  doc.roundedRect(120, finalY, 76, 32, 2, 2, 'F');
  doc.setDrawColor(229, 224, 218);
  doc.roundedRect(120, finalY, 76, 32, 2, 2, 'D');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 65, 60);
  doc.text('Total Billed:', 124, finalY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(formatCurrency(shoot.clientAmount), 192, finalY + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 65, 60);
  doc.text('Payment Status:', 124, finalY + 18);

  if (shoot.clientPaid) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61); // Green
    doc.text(`PAID (${shoot.clientPaidAt ? shoot.clientPaidAt.split('T')[0] : 'Settled'})`, 192, finalY + 18, { align: 'right' });
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(197, 48, 48); // Red
    doc.text('PENDING', 192, finalY + 18, { align: 'right' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 95, 90);
  doc.text('Balance Due:', 124, finalY + 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(shoot.clientPaid ? 21 : 197, shoot.clientPaid ? 128 : 48, shoot.clientPaid ? 61 : 48);
  doc.text(shoot.clientPaid ? '₹0' : formatCurrency(shoot.clientAmount), 192, finalY + 27, { align: 'right' });

  // Payment Details & Footer
  const footerY = Math.max(finalY + 45, 230);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 25, 23);
  doc.text('Payment Instructions & Terms:', 14, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 75, 70);
  doc.text(opt.paymentDetails, 14, footerY + 6);
  doc.text('Thank you for partnering with SMM Ops Tool for your visual marketing assets.', 14, footerY + 12);
  doc.text('All deliverables are shared via authorized cloud links upon payment clearance.', 14, footerY + 18);

  return doc;
}

/**
 * Generates a clean Cameraman Payout Receipt PDF
 */
export function generateCameramanPayoutReceiptPDF(
  cameraman: Cameraman,
  shoot: Shoot,
  assignmentAmount: number,
  isPaid: boolean,
  paidAt?: string | null,
  options: Partial<InvoiceOptions> = {}
): jsPDF {
  const doc = new jsPDF();
  const opt = { ...DEFAULT_BIZ, ...options };
  const receiptNumber = `RCP-${shoot.date.replace(/-/g, '')}-${cameraman.id.slice(0, 4).toUpperCase()}`;

  // Header banner
  doc.setFillColor(250, 248, 245);
  doc.rect(0, 0, 210, 42, 'F');

  // Business Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(28, 25, 23);
  doc.text(opt.businessName, 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 95, 90);
  doc.text(`Operations Admin  |  Contact: ${opt.businessPhone}`, 14, 25);
  doc.text('Freelance Production Payout Voucher', 14, 31);

  // Top Right: Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(200, 90, 50);
  doc.text('PAYOUT VOUCHER', 196, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 65, 60);
  doc.text(`Receipt #: ${receiptNumber}`, 196, 26, { align: 'right' });
  doc.text(`Date: ${shoot.date}`, 196, 32, { align: 'right' });

  // Divider
  doc.setDrawColor(229, 224, 218);
  doc.setLineWidth(0.5);
  doc.line(14, 44, 196, 44);

  // Cameraman & Shoot Details
  let currentY = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text('CAMERAMAN / CREW MEMBER:', 14, currentY);
  doc.text('ASSIGNMENT DETAILS:', 110, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(cameraman.name, 14, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 65, 60);
  doc.text(`Shoot Location: ${shoot.location}`, 110, currentY);

  currentY += 5;
  doc.text(`Phone: ${cameraman.phone}`, 14, currentY);
  doc.text(`Shoot Date: ${shoot.date}`, 110, currentY);

  currentY += 5;
  doc.text(`Standard Rate: ${formatCurrency(cameraman.rate)}/day`, 14, currentY);
  doc.text(`Shoot Status: ${shoot.status.toUpperCase()}`, 110, currentY);

  currentY += 12;

  // Breakdown table
  const tableRows = [
    [
      `Cinematography / Videography Services\nLocation: ${shoot.location}\nDate: ${shoot.date}`,
      '1 Day / Job',
      formatCurrency(assignmentAmount),
      formatCurrency(assignmentAmount),
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Scope', 'Agreed Rate', 'Payout Amount']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [240, 236, 230],
      textColor: [28, 25, 23],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      textColor: [40, 35, 30],
      fontSize: 9,
      cellPadding: 6,
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 26, halign: 'right' },
    },
    styles: {
      lineColor: [229, 224, 218],
      lineWidth: 0.2,
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Payout Summary Card
  doc.setFillColor(250, 248, 245);
  doc.roundedRect(120, finalY, 76, 32, 2, 2, 'F');
  doc.setDrawColor(229, 224, 218);
  doc.roundedRect(120, finalY, 76, 32, 2, 2, 'D');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 65, 60);
  doc.text('Payout Amount:', 124, finalY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(formatCurrency(assignmentAmount), 192, finalY + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 65, 60);
  doc.text('Disbursement Status:', 124, finalY + 18);

  if (isPaid) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61);
    doc.text(`PAID (${paidAt ? paidAt.split('T')[0] : 'Disbursed'})`, 192, finalY + 18, { align: 'right' });
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(197, 48, 48);
    doc.text('PENDING DISBURSEMENT', 192, finalY + 18, { align: 'right' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 95, 90);
  doc.text('Balance Outstanding:', 124, finalY + 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(isPaid ? 21 : 197, isPaid ? 128 : 48, isPaid ? 61 : 48);
  doc.text(isPaid ? '₹0' : formatCurrency(assignmentAmount), 192, finalY + 27, { align: 'right' });

  // Sign-off / Acknowledgement
  const footerY = Math.max(finalY + 45, 230);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 25, 23);
  doc.text('Authorized Business Signatory:', 14, footerY);

  doc.setDrawColor(200, 195, 190);
  doc.line(14, footerY + 18, 70, footerY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 95, 90);
  doc.text('Founder / Managing Partner', 14, footerY + 23);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 25, 23);
  doc.text('Crew Member Acknowledgement:', 120, footerY);
  doc.line(120, footerY + 18, 180, footerY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 95, 90);
  doc.text(`${cameraman.name} (Signature / Date)`, 120, footerY + 23);

  return doc;
}
