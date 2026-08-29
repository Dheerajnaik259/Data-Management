interface CameramanScheduleMessageParams {
  phone: string;
  cameramanName: string;
  clientName?: string;
  date: string;
  callTime?: string | null;
  location: string;
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
}: CameramanScheduleMessageParams): string | null => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return null;

  const clientLine = clientName ? `\nClient: ${clientName}` : '';
  const message = [
    `Hi ${cameramanName},`,
    '',
    'You have been scheduled for a shoot.',
    `Date: ${formatShootDate(date)}`,
    `Call time: ${callTime || 'To be confirmed'}`,
    `Location: ${location}${clientLine}`,
    '',
    'Please confirm your availability. Thank you!',
  ].join('\n');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};
