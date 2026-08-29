import React, { useState, useEffect } from 'react';
import { X, Download, Printer, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, Cameraman, Shoot } from '../../types';
import {
  generateClientInvoicePDF,
  generateCameramanPayoutReceiptPDF,
} from '../../utils/pdfGenerator';

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
}) => {
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !shoot) return;

    try {
      if (type === 'client_invoice' && client) {
        const doc = generateClientInvoicePDF(client, shoot);
        const dataUri = doc.output('datauristring');
        setPdfDataUri(dataUri);
      } else if (type === 'cameraman_receipt' && cameraman) {
        const doc = generateCameramanPayoutReceiptPDF(
          cameraman,
          shoot,
          assignmentAmount,
          assignmentPaid,
          assignmentPaidAt
        );
        const dataUri = doc.output('datauristring');
        setPdfDataUri(dataUri);
      }
    } catch (err) {
      console.error('Error generating PDF preview:', err);
    }
  }, [isOpen, type, client, cameraman, shoot, assignmentAmount, assignmentPaid, assignmentPaidAt]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (type === 'client_invoice' && client) {
      const doc = generateClientInvoicePDF(client, shoot);
      doc.save(`Invoice_${client.name.replace(/\s+/g, '_')}_${shoot.date}.pdf`);
    } else if (type === 'cameraman_receipt' && cameraman) {
      const doc = generateCameramanPayoutReceiptPDF(
        cameraman,
        shoot,
        assignmentAmount,
        assignmentPaid,
        assignmentPaidAt
      );
      doc.save(`Receipt_${cameraman.name.replace(/\s+/g, '_')}_${shoot.date}.pdf`);
    }
  };

  const handlePrint = () => {
    if (type === 'client_invoice' && client) {
      const doc = generateClientInvoicePDF(client, shoot);
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else if (type === 'cameraman_receipt' && cameraman) {
      const doc = generateCameramanPayoutReceiptPDF(
        cameraman,
        shoot,
        assignmentAmount,
        assignmentPaid,
        assignmentPaidAt
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
          className="fixed inset-0 bg-[#1C1917]/50 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white rounded-lg border border-[#E5E0DA] shadow-2xl w-full max-w-4xl h-[88vh] flex flex-col z-10 overflow-hidden"
        >
          {/* Top Bar */}
          <div className="px-6 py-4 border-b border-[#E5E0DA] bg-[#FAF8F5] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-[#C85A32]/10 text-[#C85A32] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-[#1C1917]">
                  {type === 'client_invoice' ? 'Client Invoice PDF Preview' : 'Cameraman Payout Receipt Preview'}
                </h3>
                <p className="text-xs text-[#78716C]">
                  {type === 'client_invoice' ? client?.name : cameraman?.name} &bull; Shoot {shoot.date} ({shoot.location})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#57534E] bg-white border border-[#E5E0DA] rounded-md hover:bg-[#FAF8F5] transition-colors"
                title="Print PDF Document"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#C85A32] rounded-md hover:bg-[#B84A24] transition-colors shadow-xs"
                title="Download PDF Document"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#E5E0DA]/50 rounded-md transition-colors ml-2"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* PDF Viewer / Iframe Frame */}
          <div className="flex-1 bg-[#4A4744] p-2 sm:p-4 overflow-hidden flex items-center justify-center">
            {pdfDataUri ? (
              <iframe
                src={pdfDataUri}
                title="PDF Preview"
                className="w-full h-full rounded shadow-md border-0 bg-white"
              />
            ) : (
              <div className="flex items-center justify-center text-white text-xs">
                Generating document preview...
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
