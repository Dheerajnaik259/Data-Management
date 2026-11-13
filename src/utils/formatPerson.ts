const roleLabels: Record<string, string> = {
  admin: 'Admin',
  founder: 'Founder',
  founder_ceo: 'Founder / CEO',
  founder_coo: 'Founder / COO',
  social_media_manager: 'Social Media Manager',
};

export function formatPerson(name?: string, role?: string): string {
  if (!name) return 'Unknown user';
  return `${name} (${roleLabels[role ?? ''] ?? role ?? 'Unknown role'})`;
}
