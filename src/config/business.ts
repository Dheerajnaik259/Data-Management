import { InvoiceOptions } from '../utils/pdfGenerator';

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};

const configuredValue = (key: string, fallback: string) => env[key]?.trim() || fallback;

export const businessInvoiceProfile: Pick<Required<InvoiceOptions>, 'businessName' | 'businessEmail' | 'businessPhone' | 'paymentDetails'> = {
  businessName: configuredValue('VITE_BUSINESS_NAME', 'Business name not configured'),
  businessEmail: configuredValue('VITE_BUSINESS_EMAIL', 'Business email not configured'),
  businessPhone: configuredValue('VITE_BUSINESS_PHONE', 'Business phone not configured'),
  paymentDetails: configuredValue('VITE_PAYMENT_DETAILS', 'Payment details not configured'),
};

export const isBusinessInvoiceProfileConfigured = [
  'VITE_BUSINESS_NAME',
  'VITE_BUSINESS_EMAIL',
  'VITE_BUSINESS_PHONE',
  'VITE_PAYMENT_DETAILS',
].every(key => Boolean(env[key]?.trim()));
