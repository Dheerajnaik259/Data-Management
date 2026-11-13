import type jsPDF from 'jspdf';
import { Client, Cameraman, Shoot } from '../types';

const mpixelMediaLogoUrl = new URL('../assets/mpixelmedia-logo.png', import.meta.url).href;

const BRAND_NAME = 'Mpixel Media';

export function formatPdfCurrency(amount: number | undefined | null): string {
  const value = amount == null || Number.isNaN(amount) ? 0 : amount;
  return `INR ${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value)}`;
}

export interface InvoiceOptions {
  invoiceNumber: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  paymentDetails?: string;
  gstRegistered?: boolean;
  gstin?: string;
  gstRate?: number;
  gstType?: 'split' | 'integrated';
}

const DEFAULT_BIZ: Required<InvoiceOptions> = {
  invoiceNumber: 'INV-001',
  businessName: BRAND_NAME,
  businessEmail: '',
  businessPhone: '',
  paymentDetails: '',
  gstRegistered: false,
  gstin: '',
  gstRate: 0,
  gstType: 'split',
};

export interface InvoiceGstBreakdown {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  invoiceTotal: number;
}

export function calculateInvoiceGst(amount: number, options: Partial<InvoiceOptions>): InvoiceGstBreakdown {
  const taxableAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const gstinConfigured = Boolean(options.gstin?.trim() && /^[0-9A-Z]{15}$/.test(options.gstin.trim().toUpperCase()));
  const rate = options.gstRegistered && gstinConfigured && Number.isFinite(options.gstRate)
    ? Math.min(100, Math.max(0, options.gstRate ?? 0))
    : 0;
  const totalTax = Math.round((taxableAmount * rate / 100) * 100) / 100;
  const cgst = rate > 0 && options.gstType !== 'integrated' ? Math.round((totalTax / 2) * 100) / 100 : 0;
  const sgst = rate > 0 && options.gstType !== 'integrated' ? totalTax - cgst : 0;
  const igst = options.gstType === 'integrated' ? totalTax : 0;

  return {
    taxableAmount,
    cgst,
    sgst,
    igst,
    totalTax,
    invoiceTotal: taxableAmount + totalTax,
  };
}

export function formatPdfTaxCurrency(amount: number): string {
  return `INR ${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount)}`;
}

async function loadBrandLogo(): Promise<string> {
  const response = await fetch(mpixelMediaLogoUrl);
  if (!response.ok) throw new Error('Unable to load the Mpixel Media logo for the billing document.');

  const reader = new FileReader();
  const logoData = new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unable to read the Mpixel Media logo for the billing document.'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error('Unable to read the Mpixel Media logo for the billing document.'));
  });
  reader.readAsDataURL(await response.blob());
  return logoData;
}

async function drawBillingHeader(
  doc: jsPDF,
  contactLine: string,
  descriptor: string,
  gstin?: string,
  documentTitle = 'INVOICE',
): Promise<void> {
  const logo = await loadBrandLogo();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 48, 'F');
  doc.setFillColor(66, 222, 213);
  doc.rect(0, 0, 210, 1.5, 'F');
  doc.setFillColor(243, 154, 74);
  doc.rect(190, 0, 20, 1.5, 'F');
  doc.addImage(logo, 'PNG', 178, 8, 20, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 37, 39);
  doc.text(BRAND_NAME, 174, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(83, 91, 96);
  if (contactLine) doc.text(contactLine, 174, 19, { align: 'right', maxWidth: 50 });
  doc.setTextColor(32, 191, 174);
  if (gstin) {
    doc.text(`GSTIN: ${gstin}`, 174, 25, { align: 'right', maxWidth: 50 });
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(29);
  doc.setTextColor(90, 90, 90);
  doc.text(documentTitle, 14, 27);
  doc.setFontSize(6.5);
  doc.setTextColor(83, 91, 96);
  doc.text(descriptor, 14, 35, { maxWidth: 110 });
  doc.setDrawColor(225, 231, 231);
  doc.setLineWidth(0.25);
  doc.line(14, 46, 196, 46);
}

/**
 * Generates a clean, professional Client Invoice PDF
 */
export async function generateClientInvoicePDF(
  client: Client,
  shoot: Shoot,
  options: Partial<InvoiceOptions> = {}
): Promise<jsPDF> {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new JsPDF();
  const opt = { ...DEFAULT_BIZ, ...options };
  const invNumber = opt.invoiceNumber || `INV-${shoot.date.replace(/-/g, '')}-${shoot.id.slice(0, 4).toUpperCase()}`;
  const gst = calculateInvoiceGst(shoot.clientAmount, opt);

  await drawBillingHeader(
    doc,
    [opt.businessEmail, opt.businessPhone].filter(Boolean).join('  |  '),
    'CREATIVE PRODUCTION & SOCIAL MEDIA',
    gst.totalTax > 0 ? opt.gstin : undefined,
  );

  doc.setFillColor(242, 242, 242);
  doc.rect(14, 51, 182, 32, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(55, 55, 55);
  doc.text('INVOICE TO', 22, 59);
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(client.name, 22, 67, { maxWidth: 66 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(83, 91, 96);
  doc.text(`Phone: ${client.phone}`, 22, 74, { maxWidth: 66 });
  doc.setFontSize(6.5);
  doc.text(`Invoice No: ${invNumber}`, 112, 59, { maxWidth: 76 });
  doc.text(`Invoice Date: ${shoot.date}`, 112, 66, { maxWidth: 76 });
  doc.text(`Project Location: ${shoot.location}`, 112, 73, { maxWidth: 76 });
  if (client.contractLink) {
    doc.text(`Contract: ${client.contractLink}`, 22, 79, { maxWidth: 80 });
  }

  const deliverablesSummary = shoot.deliverables && shoot.deliverables.length > 0
    ? shoot.deliverables.map((d) => `${d.count}x ${d.type}`).join(', ')
    : 'Full production package';

  const tableRows = [
    [
      `Social media marketing & video production\n${gst.totalTax > 0 ? 'SAC 998361  |  ' : ''}Deliverables: ${deliverablesSummary}`,
      '1',
      formatPdfCurrency(shoot.clientAmount),
      formatPdfCurrency(shoot.clientAmount),
    ],
  ];

  autoTable(doc, {
    startY: 89,
    head: [['ITEM DESCRIPTION', 'QTY', 'RATE', 'PRICE']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [66, 222, 213],
      textColor: [7, 27, 26],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4.5,
    },
    bodyStyles: {
      textColor: [40, 48, 52],
      fontSize: 8.5,
      cellPadding: 6,
      minCellHeight: 15,
      fillColor: [231, 231, 231],
    },
    columnStyles: {
      0: { cellWidth: 94 },
      1: { cellWidth: 28, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    styles: {
      lineColor: [255, 255, 255],
      lineWidth: 0.5,
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  doc.setDrawColor(90, 90, 90);
  doc.setLineWidth(1);
  doc.line(14, finalY, 196, finalY);
  doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(83, 91, 96);
  const totalsX = 122;
  if (gst.totalTax > 0) {
    doc.text('SUBTOTAL', totalsX, finalY + 7);
    doc.text(formatPdfCurrency(gst.taxableAmount), 190, finalY + 7, { align: 'right' });
    doc.text(opt.gstType === 'integrated' ? `GST (IGST ${opt.gstRate}%)` : `GST (CGST ${(opt.gstRate ?? 0) / 2}%)`, totalsX, finalY + 14);
    doc.text(formatPdfTaxCurrency(opt.gstType === 'integrated' ? gst.igst : gst.cgst), 190, finalY + 14, { align: 'right' });
    if (opt.gstType !== 'integrated') {
      doc.text(`GST (SGST ${(opt.gstRate ?? 0) / 2}%)`, totalsX, finalY + 21);
      doc.text(formatPdfTaxCurrency(gst.sgst), 190, finalY + 21, { align: 'right' });
    }
    doc.setFillColor(66, 222, 213);
    doc.rect(110, finalY + 27, 86, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(7, 27, 26);
    doc.text('GRAND TOTAL', 116, finalY + 35);
    doc.text(formatPdfTaxCurrency(gst.invoiceTotal), 190, finalY + 35, { align: 'right' });
  } else {
    doc.setFont('helvetica', 'bold');
    doc.text('SUBTOTAL', totalsX, finalY + 8);
    doc.text(formatPdfCurrency(gst.taxableAmount), 190, finalY + 8, { align: 'right' });
    doc.setFillColor(66, 222, 213);
    doc.rect(110, finalY + 14, 86, 12, 'F');
    doc.setFontSize(10);
    doc.setTextColor(7, 27, 26);
    doc.text('GRAND TOTAL', 116, finalY + 22);
    doc.text(formatPdfCurrency(gst.invoiceTotal), 190, finalY + 22, { align: 'right' });
  }

  const footerY = finalY + (gst.totalTax > 0 ? 48 : 34);
  doc.setFillColor(75, 75, 75);
  doc.rect(14, footerY, 182, 26, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(66, 222, 213);
  doc.text('PAYMENT DETAILS', 22, footerY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  if (opt.paymentDetails) {
    doc.text(doc.splitTextToSize(opt.paymentDetails, 86), 22, footerY + 13);
  } else {
    doc.text('Please contact Mpixel Media for payment instructions.', 22, footerY + 13, { maxWidth: 86 });
  }
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(66, 222, 213);
  doc.text('PAYMENT STATUS', 115, footerY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(shoot.clientPaid ? 'Paid in full' : 'Payment due', 115, footerY + 13);
  doc.text('Thank you for your business.', 115, footerY + 20);
  const termsY = footerY + 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(28, 37, 39);
  doc.text('TERMS AND CONDITIONS', 22, termsY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(83, 91, 96);
  doc.text('All deliverables are shared via authorized cloud links upon payment clearance.', 22, termsY + 5, { maxWidth: 165 });

  return doc;
}

/**
 * Generates a clean Cameraman Payout Receipt PDF
 */
export async function generateCameramanPayoutReceiptPDF(
  cameraman: Cameraman,
  shoot: Shoot,
  assignmentAmount: number,
  isPaid: boolean,
  paidAt?: string | null,
  options: Partial<InvoiceOptions> = {}
): Promise<jsPDF> {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new JsPDF();
  const opt = { ...DEFAULT_BIZ, ...options };
  const receiptNumber = opt.invoiceNumber || `RCP-${shoot.date.replace(/-/g, '')}-${cameraman.id.slice(0, 4).toUpperCase()}`;

  await drawBillingHeader(
    doc,
    ['Operations Admin', opt.businessPhone].filter(Boolean).join('  |  '),
    'PRODUCTION TEAM DISBURSEMENT',
    undefined,
    'PAYOUT',
  );

  doc.setFillColor(242, 242, 242);
  doc.rect(14, 51, 182, 32, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(55, 55, 55);
  doc.text('PAID TO', 22, 59);
  doc.setFontSize(10);
  doc.setTextColor(28, 37, 39);
  doc.text(cameraman.name, 22, 67, { maxWidth: 66 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(83, 91, 96);
  doc.text(`Phone: ${cameraman.phone}`, 22, 74, { maxWidth: 66 });
  doc.text(`Receipt No: ${receiptNumber}`, 112, 59, { maxWidth: 76 });
  doc.text(`Date: ${shoot.date}`, 112, 66, { maxWidth: 76 });
  doc.text(`Project Location: ${shoot.location}`, 112, 73, { maxWidth: 76 });

  const tableRows = [
    [
      'Cinematography / Videography Services',
      '1',
      formatPdfCurrency(assignmentAmount),
      formatPdfCurrency(assignmentAmount),
    ],
  ];

  autoTable(doc, {
    startY: 89,
    head: [['ITEM DESCRIPTION', 'QTY', 'RATE', 'PRICE']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [66, 222, 213],
      textColor: [7, 27, 26],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4.5,
    },
    bodyStyles: {
      textColor: [40, 48, 52],
      fontSize: 8.5,
      cellPadding: 6,
      minCellHeight: 15,
      fillColor: [231, 231, 231],
    },
    columnStyles: {
      0: { cellWidth: 94 },
      1: { cellWidth: 28, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    styles: {
      lineColor: [255, 255, 255],
      lineWidth: 0.5,
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  doc.setFillColor(250, 252, 252);
  doc.roundedRect(14, finalY, 82, 38, 2, 2, 'F');
  doc.setDrawColor(225, 231, 231);
  doc.roundedRect(14, finalY, 82, 38, 2, 2, 'D');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(83, 91, 96);
  doc.text('DISBURSEMENT INFORMATION', 20, finalY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(isPaid ? 21 : 163, isPaid ? 128 : 105, isPaid ? 61 : 36);
  doc.text(isPaid ? 'PAID IN FULL' : 'DISBURSEMENT PENDING', 20, finalY + 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(83, 91, 96);
  doc.text(isPaid && paidAt ? `Paid ${paidAt.split('T')[0]}` : 'Pending payment confirmation.', 20, finalY + 25);

  doc.setFillColor(245, 250, 249);
  doc.roundedRect(108, finalY, 88, 38, 2, 2, 'F');
  doc.setDrawColor(53, 184, 173);
  doc.roundedRect(108, finalY, 88, 38, 2, 2, 'D');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(83, 91, 96);
  doc.text(isPaid ? 'AMOUNT PAID' : 'AMOUNT OUTSTANDING', 114, finalY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(28, 37, 39);
  doc.text(formatPdfCurrency(assignmentAmount), 114, finalY + 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(83, 91, 96);
  doc.text(`Total ${formatPdfCurrency(assignmentAmount)}`, 114, finalY + 29);

  const footerY = finalY + 57;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(28, 37, 39);
  doc.text('ACKNOWLEDGEMENT', 14, footerY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(83, 91, 96);
  doc.text('Authorized business signatory', 14, footerY + 7);
  doc.text('Crew member acknowledgement', 120, footerY + 7);
  doc.setDrawColor(200, 195, 190);
  doc.line(14, footerY + 23, 72, footerY + 23);
  doc.line(120, footerY + 23, 184, footerY + 23);
  doc.setFontSize(7);
  doc.text('Founder / Managing Partner', 14, footerY + 28);
  doc.text(`${cameraman.name} · Signature / Date`, 120, footerY + 28, { maxWidth: 72 });

  return doc;
}
