import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, Printer, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, Cameraman, Shoot } from '../../types';
import {
  generateClientInvoicePDF,
  generateCameramanPayoutReceiptPDF,
  formatPdfCurrency,
  formatPdfTaxCurrency,
  calculateInvoiceGst,
} from '../../utils/pdfGenerator';
import { parseBusinessProfileFromSettings } from '../../config/business';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { canEditBusinessProfile } from '../../utils/permissions';
import { requestInvoiceNumber } from '../../supabase/data';

const mpixelMediaLogoUrl = new URL('../../assets/mpixelmedia-logo.png', import.meta.url).href;

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'client_invoice' | 'cameraman_receipt';
  client?: Client;
  cameraman?: Cameraman;
  shoot: Shoot;
  assignmentAmount?: number;
  assignmentPaid?: boolean;
  assignmentPaidAt?: string | null;
  assignmentIndex?: number;
  documentNumber?: string;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  type,
  client,
  cameraman,
  shoot,
  assignmentAmount = 0,
  assignmentPaid = false,
  assignmentPaidAt = null,
  assignmentIndex,
  documentNumber,
}) => {
  const { settings } = useData();
  const { user } = useAuth();
  const [resolvedDocumentNumber, setResolvedDocumentNumber] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [invoiceGstType, setInvoiceGstType] = useState<'split' | 'integrated'>('split');

  const businessProfile = useMemo(
    () => parseBusinessProfileFromSettings(settings.find(s => s.key === 'businessProfile')),
    [settings],
  );
  const invoiceProfile = { ...businessProfile, gstType: invoiceGstType };
  const gstBreakdown = calculateInvoiceGst(shoot.clientAmount, invoiceProfile);

  useEffect(() => {
    setInvoiceGstType(businessProfile.gstType);
  }, [businessProfile.gstType, isOpen, type]);

  useEffect(() => {
    if (!isOpen || !shoot) return;
    let active = true;
    setDocumentError(null);
    if (documentNumber) {
      setResolvedDocumentNumber(documentNumber);
      return () => { active = false; };
    }
    if (!assignmentPaid) {
      const documentType = type === 'client_invoice' ? 'INV' : `RCP-${assignmentIndex ?? 'NA'}`;
      setResolvedDocumentNumber(`DRAFT-${documentType}-${shoot.id.slice(0, 6).toUpperCase()}`);
      return () => { active = false; };
    }

    setResolvedDocumentNumber(null);
    requestInvoiceNumber(type === 'client_invoice' ? 'client' : 'payout', shoot.id, assignmentIndex)
      .then(number => { if (active) setResolvedDocumentNumber(number); })
      .catch(error => {
        if (active) setDocumentError(error instanceof Error ? error.message : 'Unable to issue a document number.');
      });
    return () => { active = false; };
  }, [isOpen, shoot.id, type, assignmentPaid, assignmentIndex, documentNumber]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (type === 'client_invoice' && client) {
      if (!resolvedDocumentNumber) return;
      const doc = await generateClientInvoicePDF(client, shoot, { ...invoiceProfile, invoiceNumber: resolvedDocumentNumber });
      doc.save(`Invoice_${client.name.replace(/\s+/g, '_')}_${shoot.date}.pdf`);
    } else if (type === 'cameraman_receipt' && cameraman) {
      if (!resolvedDocumentNumber) return;
      const doc = await generateCameramanPayoutReceiptPDF(
        cameraman,
        shoot,
        assignmentAmount,
        assignmentPaid,
        assignmentPaidAt,
        { ...businessProfile, invoiceNumber: resolvedDocumentNumber },
      );
      doc.save(`Receipt_${cameraman.name.replace(/\s+/g, '_')}_${shoot.date}.pdf`);
    }
  };

  const handlePrint = async () => {
    if (type === 'client_invoice' && client) {
      if (!resolvedDocumentNumber) return;
      const doc = await generateClientInvoicePDF(client, shoot, { ...invoiceProfile, invoiceNumber: resolvedDocumentNumber });
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else if (type === 'cameraman_receipt' && cameraman) {
      if (!resolvedDocumentNumber) return;
      const doc = await generateCameramanPayoutReceiptPDF(
        cameraman,
        shoot,
        assignmentAmount,
        assignmentPaid,
        assignmentPaidAt,
        { ...businessProfile, invoiceNumber: resolvedDocumentNumber },
      );
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="glass-panel-elevated relative w-full max-w-4xl h-[88vh] flex flex-col z-10 overflow-hidden"
        >
          {/* Top Bar */}
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-white/[0.025] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-[rgba(66,222,213,0.10)] text-[var(--color-accent)] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--color-text)]">
                  {type === 'client_invoice' ? 'Client Invoice PDF Preview' : 'Cameraman Payout Receipt Preview'}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {type === 'client_invoice' ? client?.name : cameraman?.name} &bull; {resolvedDocumentNumber || 'Issuing document number…'} &bull; Shoot {shoot.date} ({shoot.location})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={!resolvedDocumentNumber}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] bg-white/[0.035] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-bg-hover)] transition-colors"
                title="Print PDF Document"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={!resolvedDocumentNumber}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[var(--color-text-on-accent)] bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors shadow-xs"
                title="Download PDF Document"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)] rounded-md transition-colors ml-2"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-[#4A4744] p-2 sm:p-4 overflow-auto">
            {documentError ? (
              <div role="alert" className="mx-auto mt-8 max-w-md rounded-xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-200">{documentError}</div>
            ) : !resolvedDocumentNumber ? (
              <div role="status" className="flex h-full items-center justify-center text-white text-xs">
                Issuing document number…
              </div>
            ) : (
              <article
                aria-label={type === 'client_invoice' ? 'Invoice document preview' : 'Payout voucher document preview'}
                className="mx-auto min-h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-sm bg-white text-slate-900 shadow-2xl"
              >
                <div className="h-1.5 bg-gradient-to-r from-[#42ded5] via-[#21bfae] to-[#f39a4a]" />
                <header className="flex min-h-36 items-center justify-between gap-4 px-6 py-7 sm:px-10">
                  <h1 className="text-4xl font-light tracking-[0.08em] text-slate-600 sm:text-5xl">
                    {type === 'client_invoice' ? 'INVOICE' : 'PAYOUT'}
                  </h1>
                  <div className="flex min-w-0 items-center gap-3 text-right">
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold tracking-tight text-[#20bfae] sm:text-xl">Mpixel Media</h2>
                      <p className="mt-1 text-[9px] leading-relaxed text-slate-600">
                        {[businessProfile.businessEmail, businessProfile.businessPhone].filter(Boolean).join(' · ')}
                      </p>
                      {type === 'client_invoice' && businessProfile.gstRegistered && businessProfile.gstin && gstBreakdown.totalTax > 0 && (
                        <p className="text-[9px] text-slate-600">GSTIN: {businessProfile.gstin}</p>
                      )}
                      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                        {type === 'client_invoice' ? 'Social media & video production' : 'Production team disbursement'}
                      </p>
                    </div>
                    <img src={mpixelMediaLogoUrl} alt="Mpixel Media" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  </div>
                </header>

                <div className="px-6 sm:px-10">
                  <section className="grid gap-4 bg-[#f1f1f1] px-5 py-5 sm:grid-cols-[1.05fr_0.95fr] sm:px-8">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                        {type === 'client_invoice' ? 'Invoice to' : 'Paid to'}
                      </p>
                      <h4 className="mt-1 text-sm font-bold text-slate-800">{type === 'client_invoice' ? client?.name : cameraman?.name}</h4>
                      <p className="text-[11px] text-slate-600">{type === 'client_invoice' ? client?.phone : cameraman?.phone}</p>
                      {type === 'client_invoice' && client?.contractLink && (
                        <p className="mt-1 break-all text-[10px] text-slate-600">Contract: {client.contractLink}</p>
                      )}
                    </div>
                    <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-[10px]">
                      <dt className="font-semibold text-slate-600">{type === 'client_invoice' ? 'Invoice no.' : 'Receipt no.'}</dt>
                      <dd className="text-right font-bold text-slate-800">{resolvedDocumentNumber}</dd>
                      <dt className="font-semibold text-slate-600">Date</dt>
                      <dd className="text-right text-slate-700">{shoot.date}</dd>
                      <dt className="font-semibold text-slate-600">Location</dt>
                      <dd className="text-right text-slate-700">{shoot.location}</dd>
                    </dl>
                  </section>

                  <section className="mt-7 overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 bg-[#42ded5] px-3 py-3 text-[9px] font-bold uppercase tracking-wide text-[#071b1a] sm:gap-3 sm:px-5 sm:text-[10px]">
                      <span className="col-span-6">Item description</span>
                      <span className="col-span-2 text-center">Qty</span>
                      <span className="col-span-2 text-right">Rate</span>
                      <span className="col-span-2 text-right">Price</span>
                    </div>
                    <div className="grid grid-cols-12 items-start gap-2 bg-[#e7e7e7] px-3 py-4 text-sm sm:gap-3 sm:px-5">
                      <div className="col-span-6">
                        <p className="font-semibold leading-snug text-slate-900">
                          {type === 'client_invoice' ? 'Social media management & video production' : 'Cinematography / videography services'}
                        </p>
                        {type === 'client_invoice' && gstBreakdown.totalTax > 0 && (
                          <p className="mt-1 text-[9px] font-medium uppercase tracking-wide text-slate-500">SAC 998361</p>
                        )}
                        {type === 'client_invoice' && (
                          <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
                            {shoot.deliverables?.length
                              ? shoot.deliverables.map(item => `${item.count} × ${item.type}`).join(' · ')
                              : 'Full production package'}
                          </p>
                        )}
                      </div>
                      <span className="col-span-2 pt-0.5 text-center text-xs text-slate-700">{type === 'client_invoice' ? '1' : '1 job'}</span>
                      <span className="col-span-2 pt-0.5 text-right text-xs tabular-nums text-slate-700">{formatPdfCurrency(type === 'client_invoice' ? shoot.clientAmount : assignmentAmount)}</span>
                      <span className="col-span-2 pt-0.5 text-right text-sm font-semibold tabular-nums text-slate-900">{formatPdfCurrency(type === 'client_invoice' ? shoot.clientAmount : assignmentAmount)}</span>
                    </div>
                    <div className="border-t-4 border-slate-500 bg-[#f2f2f2] px-4 py-3 sm:px-6">
                      <div className="ml-auto max-w-xs space-y-1.5 text-xs">
                        <div className="flex justify-between gap-6 font-semibold text-slate-700">
                          <span>Subtotal</span>
                          <span>{formatPdfCurrency(type === 'client_invoice' ? gstBreakdown.taxableAmount : assignmentAmount)}</span>
                        </div>
                        {type === 'client_invoice' && gstBreakdown.totalTax > 0 && (
                          <>
                            {invoiceProfile.gstType === 'integrated' ? (
                              <div className="flex justify-between gap-6 text-slate-700">
                                <span>IGST ({businessProfile.gstRate}%)</span>
                                <span>{formatPdfTaxCurrency(gstBreakdown.igst)}</span>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between gap-6 text-slate-700">
                                  <span>CGST ({businessProfile.gstRate / 2}%)</span>
                                  <span>{formatPdfTaxCurrency(gstBreakdown.cgst)}</span>
                                </div>
                                <div className="flex justify-between gap-6 text-slate-700">
                                  <span>SGST ({businessProfile.gstRate / 2}%)</span>
                                  <span>{formatPdfTaxCurrency(gstBreakdown.sgst)}</span>
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                      <div className="ml-auto mt-3 flex max-w-sm items-center justify-between gap-4 bg-gradient-to-r from-[#42ded5] to-[#20bfae] px-4 py-2.5 text-[#071b1a]">
                        <span className="text-sm font-bold uppercase">{type === 'client_invoice' ? 'Grand total' : 'Payout total'}</span>
                        <span className="text-lg font-bold tabular-nums">
                          {type === 'client_invoice'
                            ? gstBreakdown.totalTax > 0 ? formatPdfTaxCurrency(gstBreakdown.invoiceTotal) : formatPdfCurrency(gstBreakdown.invoiceTotal)
                            : formatPdfCurrency(assignmentAmount)}
                        </span>
                      </div>
                    </div>
                  </section>

                  <section className="mt-7 bg-[#17191b] px-5 py-5 text-white sm:px-8">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-semibold text-[#27c8b7]">{type === 'client_invoice' ? 'Payment method / details' : 'Disbursement status'}</p>
                        <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-100">
                          {type === 'client_invoice'
                            ? businessProfile.paymentDetails || 'Please contact Mpixel Media for payment instructions.'
                            : assignmentPaid ? `Paid${assignmentPaidAt ? ` on ${assignmentPaidAt.split('T')[0]}` : ''}` : 'Pending payment'}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        {type === 'client_invoice' && gstBreakdown.totalTax > 0 && user && canEditBusinessProfile(user.role) && (
                          <label className="mb-3 block text-left text-[10px] text-slate-200 sm:ml-auto sm:max-w-xs">
                            GST place of supply
                            <select
                              value={invoiceGstType}
                              onChange={event => setInvoiceGstType(event.target.value === 'integrated' ? 'integrated' : 'split')}
                              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-800"
                            >
                              <option value="split">CGST + SGST</option>
                              <option value="integrated">IGST</option>
                            </select>
                          </label>
                        )}
                        <p className="mt-2 text-[11px] text-slate-100">Thank you for your business.</p>
                        <p className="mt-2 text-[10px] font-semibold text-[#27c8b7]">
                          {(type === 'client_invoice' ? shoot.clientPaid : assignmentPaid) ? 'PAID' : 'PAYMENT DUE'}
                        </p>
                      </div>
                    </div>
                  </section>

                  <footer className="px-5 py-5 text-[10px] text-slate-600 sm:px-8">
                    <p className="font-bold text-slate-800">Terms and conditions</p>
                    <p className="mt-1 leading-relaxed">
                      All deliverables are shared via authorized cloud links upon payment clearance. Thank you for choosing Mpixel Media.
                    </p>
                  </footer>
                </div>
              </article>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
