import { formatTime12h } from './formatTime';

interface CameramanScheduleMessageParams {
  phone: string;
  cameramanName: string;
  clientName?: string;
  date: string;
  callTime?: string | null;
  location: string;
  template?: string;
}

interface ClientReminderMessageParams {
  phone: string;
  clientName: string;
  amount: string;
  date: string;
  location: string;
  template?: string;
}

const formatShootDate = (date: string) => {
  const parsedDate = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsedDate.getTime())
    ? date
    : new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(parsedDate);
};

export const buildCameramanScheduleWhatsAppUrl = ({
  phone,
  cameramanName,
  clientName,
  date,
  callTime,
  location,
  template,
}: CameramanScheduleMessageParams): string | null => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return null;

  const formattedCallTime = formatTime12h(callTime) || 'To be confirmed';

  let message: string;
  if (template && template.trim()) {
    message = template
      .replace(/\{cameramanName\}/g, cameramanName)
      .replace(/\{clientName\}/g, clientName || 'N/A')
      .replace(/\{date\}/g, formatShootDate(date))
      .replace(/\{callTime\}/g, formattedCallTime)
      .replace(/\{location\}/g, location);
  } else {
    const clientLine = clientName ? `\nClient: ${clientName}` : '';
    message = [
      `Hi ${cameramanName},`,
      '',
      'You have been scheduled for a shoot.',
      `Date: ${formatShootDate(date)}`,
      `Call time: ${formattedCallTime}`,
      `Location: ${location}${clientLine}`,
      '',
      'Please confirm your availability. Thank you!',
    ].join('\n');
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

export const buildClientPaymentReminderWhatsAppUrl = ({
  phone,
  clientName,
  amount,
  date,
  location,
  template,
}: ClientReminderMessageParams): string | null => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return null;

  let message: string;
  if (template && template.trim()) {
    message = template
      .replace(/\{clientName\}/g, clientName)
      .replace(/\{amount\}/g, amount)
      .replace(/\{date\}/g, formatShootDate(date))
      .replace(/\{location\}/g, location);
  } else {
    message = `Hi ${clientName}! Greetings from SMM Ops Tool. This is a gentle reminder regarding the invoice of ${amount} for the shoot at ${location} on ${formatShootDate(date)}. Please let us know once transferred so we can release full final master assets. Thank you!`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};
