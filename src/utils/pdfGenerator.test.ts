import { describe, expect, it } from 'vitest';
import { calculateInvoiceGst, formatPdfCurrency, formatPdfTaxCurrency } from './pdfGenerator';

describe('formatPdfCurrency', () => {
  it('formats Indian grouping with PDF-safe currency text', () => {
    expect(formatPdfCurrency(45000)).toBe('INR 45,000');
    expect(formatPdfCurrency(145000)).toBe('INR 1,45,000');
  });

  describe('calculateInvoiceGst', () => {
    const gstin = '29ABCDE1234F1Z5';

    it('splits configured GST into CGST and SGST and adds tax to the invoice total', () => {
      expect(calculateInvoiceGst(45000, {
        gstRegistered: true,
        gstin,
        gstRate: 18,
        gstType: 'split',
      })).toEqual({
        taxableAmount: 45000,
        cgst: 4050,
        sgst: 4050,
        igst: 0,
        totalTax: 8100,
        invoiceTotal: 53100,
      });
    });

    it('uses a single IGST line for integrated tax', () => {
      expect(calculateInvoiceGst(1000, {
        gstRegistered: true,
        gstin,
        gstRate: 5,
        gstType: 'integrated',
      })).toEqual({
        taxableAmount: 1000,
        cgst: 0,
        sgst: 0,
        igst: 50,
        totalTax: 50,
        invoiceTotal: 1050,
      });
    });

    it('does not apply GST until registration details and rate are configured', () => {
      expect(calculateInvoiceGst(1000, {
        gstRegistered: true,
        gstin: '',
        gstRate: 18,
      }).invoiceTotal).toBe(1000);
      expect(calculateInvoiceGst(1000, {
        gstRegistered: false,
        gstin,
        gstRate: 18,
      }).totalTax).toBe(0);
    });

    it('keeps tax values to paise precision', () => {
      expect(calculateInvoiceGst(999, {
        gstRegistered: true,
        gstin,
        gstRate: 18,
        gstType: 'integrated',
      }).totalTax).toBe(179.82);
      expect(formatPdfTaxCurrency(179.82)).toBe('INR 179.82');
    });
  });

  it('formats missing and invalid amounts as zero', () => {
    expect(formatPdfCurrency(null)).toBe('INR 0');
    expect(formatPdfCurrency(Number.NaN)).toBe('INR 0');
  });
});
