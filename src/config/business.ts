import { InvoiceOptions } from '../utils/pdfGenerator';
import { SettingsDoc } from '../types';

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};

const configuredValue = (key: string, fallback: string) => env[key]?.trim() || fallback;

export const businessInvoiceProfile: Pick<Required<InvoiceOptions>, 'businessName' | 'businessEmail' | 'businessPhone' | 'paymentDetails'> = {
  businessName: configuredValue('VITE_BUSINESS_NAME', 'Business name not configured'),
  businessEmail: configuredValue('VITE_BUSINESS_EMAIL', 'Business email not configured'),
  businessPhone: configuredValue('VITE_BUSINESS_PHONE', 'Business phone not configured'),
  paymentDetails: configuredValue('VITE_PAYMENT_DETAILS', 'Payment details not configured'),
};

export type BusinessProfileData = {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  paymentDetails: string;
};

export function parseBusinessProfileFromSettings(settingsDoc?: SettingsDoc): BusinessProfileData {
  if (settingsDoc && settingsDoc.options?.[0]?.value) {
    try {
      const parsed = JSON.parse(settingsDoc.options[0].value);
      if (parsed && typeof parsed === 'object') {
        return {
          businessName: parsed.businessName || businessInvoiceProfile.businessName,
          businessEmail: parsed.businessEmail || businessInvoiceProfile.businessEmail,
          businessPhone: parsed.businessPhone || businessInvoiceProfile.businessPhone,
          paymentDetails: parsed.paymentDetails || businessInvoiceProfile.paymentDetails,
        };
      }
    } catch (e) {
      console.warn('Failed to parse business profile settings:', e);
    }
  }
  return businessInvoiceProfile;
}

export type OperationalSettingsData = {
  paymentGraceDays: number;
  clientReminderTemplate: string;
  crewScheduleTemplate: string;
};

export const defaultOperationalSettings: OperationalSettingsData = {
  paymentGraceDays: 7,
  clientReminderTemplate: 'Hi {clientName}! Greetings from SMM Ops. This is a gentle reminder regarding the invoice of {amount} for the shoot at {location} on {date}. Please let us know once transferred. Thank you!',
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
