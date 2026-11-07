import { describe, expect, it } from 'vitest';
import { buildShootScheduleWhatsAppDrafts } from './whatsapp';

describe('buildShootScheduleWhatsAppDrafts', () => {
  it('creates a client confirmation and one crew call sheet per assigned cameraman', () => {
    const drafts = buildShootScheduleWhatsAppDrafts(
      {
        clientId: 'client-1',
        date: '2026-12-15',
        callTime: '10:00',
        location: 'Studio & Cafe',
        assignments: [
          { cameramanId: 'crew-1', callTime: null },
          { cameramanId: 'crew-2', callTime: '11:30' },
        ],
      },
      { name: 'Client One', phone: '+91 98765 43210' },
      [
        { id: 'crew-1', name: 'Crew One', phone: '+91 90000 00001' },
        { id: 'crew-2', name: 'Crew Two', phone: '+91 90000 00002' },
      ],
    );

    expect(drafts).toHaveLength(3);
    expect(drafts[0].recipient).toBe('Client One');
    expect(drafts[0].url).toContain('wa.me/919876543210');
    expect(decodeURIComponent(new URL(drafts[0].url).searchParams.get('text') || '')).toContain('Time: 10:00 AM');
    expect(drafts[1].recipient).toBe('Crew One');
    expect(decodeURIComponent(new URL(drafts[1].url).searchParams.get('text') || '')).toContain('Call time: 10:00 AM');
    expect(drafts[2].recipient).toBe('Crew Two');
    expect(decodeURIComponent(new URL(drafts[2].url).searchParams.get('text') || '')).toContain('Call time: 11:30 AM');
  });

  it('skips recipients with no usable phone number', () => {
    const drafts = buildShootScheduleWhatsAppDrafts(
      {
        clientId: 'client-1',
        date: '2026-12-15',
        callTime: '',
        location: 'Studio',
        assignments: [{ cameramanId: 'crew-1' }],
      },
      { name: 'Client One', phone: '' },
      [{ id: 'crew-1', name: 'Crew One', phone: '---' }],
    );

    expect(drafts).toEqual([]);
  });
});
