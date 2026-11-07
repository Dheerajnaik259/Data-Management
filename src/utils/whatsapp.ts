import { formatTime12h } from './formatTime';

export interface ShootScheduleWhatsAppDraft {
  recipient: string;
  url: string;
}

interface ClientShootScheduleMessageParams {
  phone: string;
  clientName: string;
  date: string;
  callTime?: string | null;
  location: string;
}

interface ShootScheduleDetails {
  clientId: string;
  date: string;
  callTime?: string | null;
  location: string;
  assignments: Array<{ cameramanId: string; callTime?: string | null }>;
}

interface WhatsAppDraftTab {
  recipient: string;
  url: string;
  tab: Window | null;
}

export const buildClientShootScheduleWhatsAppUrl = ({
  phone,
  clientName,
  date,
  callTime,
  location,
}: ClientShootScheduleMessageParams): string | null => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return null;

  const formattedCallTime = formatTime12h(callTime) || 'To be confirmed';
  const message = [
    `Hi ${clientName},`,
    '',
    'Your shoot has been scheduled.',
    `Date: ${formatShootDate(date)}`,
    `Time: ${formattedCallTime}`,
    `Location: ${location}`,
    '',
    'We look forward to seeing you. Thank you!',
  ].join('\n');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

export function buildShootScheduleWhatsAppDrafts(
  shoot: ShootScheduleDetails,
  client: { name: string; phone: string } | undefined,
  cameramen: Array<{ id: string; name: string; phone: string }>,
  crewTemplate?: string,
): ShootScheduleWhatsAppDraft[] {
  const drafts: ShootScheduleWhatsAppDraft[] = [];
  if (client?.phone) {
    const url = buildClientShootScheduleWhatsAppUrl({
      phone: client.phone,
      clientName: client.name,
      date: shoot.date,
      callTime: shoot.callTime,
      location: shoot.location,
    });
    if (url) drafts.push({ recipient: client.name, url });
  }

  const cameramanById = new Map(cameramen.map(cameraman => [cameraman.id, cameraman]));
  shoot.assignments.forEach(assignment => {
    const cameraman = cameramanById.get(assignment.cameramanId);
    if (!cameraman?.phone) return;
    const url = buildCameramanScheduleWhatsAppUrl({
      phone: cameraman.phone,
      cameramanName: cameraman.name,
      clientName: client?.name,
      date: shoot.date,
      callTime: assignment.callTime || shoot.callTime,
      location: shoot.location,
      template: crewTemplate,
    });
    if (url) drafts.push({ recipient: cameraman.name, url });
  });
  return drafts;
}

export function prepareWhatsAppDraftTabs(drafts: ShootScheduleWhatsAppDraft[]): WhatsAppDraftTab[] {
  return drafts.map(draft => ({
    ...draft,
    tab: typeof window === 'undefined' ? null : window.open('about:blank', '_blank'),
  }));
}

export function completeWhatsAppDraftTabs(tabs: WhatsAppDraftTab[]): string[] {
  const blocked: string[] = [];
  tabs.forEach(({ recipient, url, tab }) => {
    if (!tab) {
      blocked.push(recipient);
      return;
    }
    tab.opener = null;
    tab.location.href = url;
  });
  return blocked;
}

export function cancelWhatsAppDraftTabs(tabs: WhatsAppDraftTab[]): void {
  tabs.forEach(({ tab }) => tab?.close());
}

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
    message = `Hi ${clientName}! Greetings from Mpixel Media. This is a gentle reminder regarding the invoice of ${amount} for the shoot at ${location} on ${formatShootDate(date)}. Please let us know once transferred so we can release full final master assets. Thank you!`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};
