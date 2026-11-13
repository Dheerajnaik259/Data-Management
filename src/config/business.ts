import { InvoiceOptions } from '../utils/pdfGenerator';
import { SettingsDoc } from '../types';

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};

const configuredValue = (key: string, fallback: string) => env[key]?.trim() || fallback;

export const businessInvoiceProfile: Pick<Required<InvoiceOptions>, 'businessName' | 'businessEmail' | 'businessPhone' | 'paymentDetails'> = {
  businessName: configuredValue('VITE_BUSINESS_NAME', 'Mpixel Media'),
  businessEmail: configuredValue('VITE_BUSINESS_EMAIL', ''),
  businessPhone: configuredValue('VITE_BUSINESS_PHONE', ''),
  paymentDetails: configuredValue('VITE_PAYMENT_DETAILS', ''),
};

export type BusinessProfileData = {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  paymentDetails: string;
  gstRegistered: boolean;
  gstin: string;
  gstRate: number;
  gstType: 'split' | 'integrated';
};

export function parseBusinessProfileFromSettings(settingsDoc?: SettingsDoc): BusinessProfileData {
  if (settingsDoc && settingsDoc.options?.[0]?.value) {
    try {
      const parsed = JSON.parse(settingsDoc.options[0].value);
      if (parsed && typeof parsed === 'object') {
        return {
          businessName: parsed.businessName || businessInvoiceProfile.businessName,
          businessEmail: parsed.businessEmail ?? businessInvoiceProfile.businessEmail,
          businessPhone: parsed.businessPhone ?? businessInvoiceProfile.businessPhone,
          paymentDetails: parsed.paymentDetails ?? businessInvoiceProfile.paymentDetails,
          gstRegistered: parsed.gstRegistered === true,
          gstin: typeof parsed.gstin === 'string' ? parsed.gstin : '',
          gstRate: typeof parsed.gstRate === 'number' && parsed.gstRate >= 0 ? parsed.gstRate : 0,
          gstType: parsed.gstType === 'integrated' ? 'integrated' : 'split',
        };
      }
    } catch (e) {
      console.warn('Failed to parse business profile settings:', e);
    }
  }
  return {
    ...businessInvoiceProfile,
    gstRegistered: false,
    gstin: '',
    gstRate: 0,
    gstType: 'split',
  };
}

export type OperationalSettingsData = {
  paymentGraceDays: number;
  clientReminderTemplate: string;
  crewScheduleTemplate: string;
};

export const defaultOperationalSettings: OperationalSettingsData = {
  paymentGraceDays: 7,
  clientReminderTemplate: 'Hi {clientName}! Greetings from Mpixel Media. This is a gentle reminder regarding the invoice of {amount} for the shoot at {location} on {date}. Please let us know once transferred. Thank you!',
  crewScheduleTemplate: 'Hi {cameramanName},\n\nYou have been scheduled for a shoot.\nDate: {date}\nCall time: {callTime}\nLocation: {location}\nClient: {clientName}\n\nPlease confirm your availability. Thank you!',
};

export function parseOperationalSettings(settingsDoc?: SettingsDoc): OperationalSettingsData {
  if (settingsDoc && settingsDoc.options?.[0]?.value) {
    try {
      const parsed = JSON.parse(settingsDoc.options[0].value);
      if (parsed && typeof parsed === 'object') {
        return {
          paymentGraceDays: typeof parsed.paymentGraceDays === 'number' ? Number(parsed.paymentGraceDays) : defaultOperationalSettings.paymentGraceDays,
          clientReminderTemplate: parsed.clientReminderTemplate || defaultOperationalSettings.clientReminderTemplate,
          crewScheduleTemplate: parsed.crewScheduleTemplate || defaultOperationalSettings.crewScheduleTemplate,
        };
      }
    } catch (e) {
      console.warn('Failed to parse operational settings:', e);
    }
  }
  return defaultOperationalSettings;
}

export const isBusinessInvoiceProfileConfigured = [
  'VITE_BUSINESS_NAME',
  'VITE_BUSINESS_EMAIL',
  'VITE_BUSINESS_PHONE',
  'VITE_PAYMENT_DETAILS',
].every(key => Boolean(env[key]?.trim()));
