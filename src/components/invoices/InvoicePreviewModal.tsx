import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, Printer, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, Cameraman, Shoot } from '../../types';
import {
  generateClientInvoicePDF,
  generateCameramanPayoutReceiptPDF,
} from '../../utils/pdfGenerator';
import { parseBusinessProfileFromSettings } from '../../config/business';
import { useData } from '../../context/DataContext';
import { requestInvoiceNumber } from '../../supabase/data';

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
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [resolvedDocumentNumber, setResolvedDocumentNumber] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);

  const businessProfile = useMemo(
    () => parseBusinessProfileFromSettings(settings.find(s => s.key === 'businessProfile')),
    [settings],
  );

  useEffect(() => {
    if (!isOpen || !shoot) return;
    let active = true;
    setPdfDataUri(null);
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

  useEffect(() => {
    if (!isOpen || !shoot || !resolvedDocumentNumber) return;
    try {
      if (type === 'client_invoice' && client) {
        const doc = generateClientInvoicePDF(client, shoot, { ...businessProfile, invoiceNumber: resolvedDocumentNumber });
        const dataUri = doc.output('datauristring');
        setPdfDataUri(dataUri);
      } else if (type === 'cameraman_receipt' && cameraman) {
        const doc = generateCameramanPayoutReceiptPDF(
          cameraman,
          shoot,
          assignmentAmount,
          assignmentPaid,
          assignmentPaidAt,
          { ...businessProfile, invoiceNumber: resolvedDocumentNumber },
        );
        const dataUri = doc.output('datauristring');
        setPdfDataUri(dataUri);
      } else {
        throw new Error('Recipient data is unavailable for this document.');
      }
    } catch (err) {
      setDocumentError(err instanceof Error ? err.message : 'Unable to generate the PDF preview.');
    }
  }, [isOpen, type, client, cameraman, shoot, assignmentAmount, assignmentPaid, assignmentPaidAt, businessProfile, resolvedDocumentNumber]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (type === 'client_invoice' && client) {
      if (!resolvedDocumentNumber) return;
      const doc = generateClientInvoicePDF(client, shoot, { ...businessProfile, invoiceNumber: resolvedDocumentNumber });
      doc.save(`Invoice_${client.name.replace(/\s+/g, '_')}_${shoot.date}.pdf`);
    } else if (type === 'cameraman_receipt' && cameraman) {
      if (!resolvedDocumentNumber) return;
      const doc = generateCameramanPayoutReceiptPDF(
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

  const handlePrint = () => {
    if (type === 'client_invoice' && client) {
      if (!resolvedDocumentNumber) return;
      const doc = generateClientInvoicePDF(client, shoot, { ...businessProfile, invoiceNumber: resolvedDocumentNumber });
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else if (type === 'cameraman_receipt' && cameraman) {
      if (!resolvedDocumentNumber) return;
      const doc = generateCameramanPayoutReceiptPDF(
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

          {/* PDF Viewer / Iframe Frame */}
          <div className="flex-1 bg-[#4A4744] p-2 sm:p-4 overflow-hidden flex items-center justify-center">
            {documentError ? (
              <div role="alert" className="max-w-md rounded-xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-200">{documentError}</div>
            ) : pdfDataUri ? (
              <iframe
                src={pdfDataUri}
                title="PDF Preview"
                className="w-full h-full rounded shadow-md border-0 bg-white"
              />
            ) : (
              <div role="status" className="flex items-center justify-center text-white text-xs">
                {resolvedDocumentNumber ? 'Generating document preview…' : 'Issuing document number…'}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
