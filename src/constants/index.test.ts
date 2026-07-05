import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SETTINGS,
  DEFAULT_ATTENDANTS,
  DEFAULT_QUICK_REPLIES,
  DEFAULT_WELCOME_MESSAGE,
  FALLBACK_ATTENDANT_NAME,
  STORAGE_KEYS,
} from './index';

describe('DEFAULT_SETTINGS', () => {
  it('has all required keys', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('quickAccess');
    expect(DEFAULT_SETTINGS).toHaveProperty('transferAlert');
    expect(DEFAULT_SETTINGS).toHaveProperty('attendanceControl');
    expect(DEFAULT_SETTINGS).toHaveProperty('capitalizeInitial');
    expect(DEFAULT_SETTINGS).toHaveProperty('dontRepeatInChat');
  });

  it('uses sensible defaults', () => {
    expect(DEFAULT_SETTINGS.quickAccess).toBe(true);
    expect(DEFAULT_SETTINGS.transferAlert).toBe(false);
    expect(DEFAULT_SETTINGS.attendanceControl).toBe(true);
    expect(DEFAULT_SETTINGS.capitalizeInitial).toBe(true);
    expect(DEFAULT_SETTINGS.dontRepeatInChat).toBe(false);
  });
});

describe('DEFAULT_ATTENDANTS', () => {
  it('contains the Coordenação default attendant', () => {
    expect(DEFAULT_ATTENDANTS).toHaveLength(1);
    expect(DEFAULT_ATTENDANTS[0].name).toBe('Coordenação');
    expect(DEFAULT_ATTENDANTS[0].isFavorite).toBe(true);
  });

  it('includes default formatting flags', () => {
    expect(DEFAULT_ATTENDANTS[0].quebraLinha).toBe(true);
    expect(DEFAULT_ATTENDANTS[0].negrito).toBe(true);
  });
});

describe('DEFAULT_QUICK_REPLIES', () => {
  it('includes the three default shortcuts', () => {
    const shortcuts = DEFAULT_QUICK_REPLIES.map(r => r.shortcut);
    expect(shortcuts).toEqual(['boasvindas', 'documentos', 'finalizar']);
  });

  it('all replies have non-empty text', () => {
    for (const reply of DEFAULT_QUICK_REPLIES) {
      expect(reply.text.length).toBeGreaterThan(0);
    }
  });
});

describe('DEFAULT_WELCOME_MESSAGE', () => {
  it('includes the attendant name in bold markdown', () => {
    const msg = DEFAULT_WELCOME_MESSAGE('Mailson');
    expect(msg).toContain('*Mailson*');
    expect(msg).toContain('La Home Care');
  });
});

describe('FALLBACK_ATTENDANT_NAME', () => {
  it('is Coordenação', () => {
    expect(FALLBACK_ATTENDANT_NAME).toBe('Coordenação');
  });
});

describe('STORAGE_KEYS', () => {
  it('contains all expected storage keys', () => {
    expect(STORAGE_KEYS.attendants).toBe('attendants');
    expect(STORAGE_KEYS.settings).toBe('settings');
    expect(STORAGE_KEYS.activeAttendant).toBe('activeAttendant');
    expect(STORAGE_KEYS.activeAttendances).toBe('activeAttendances');
    expect(STORAGE_KEYS.kanbanCards).toBe('kanbanCards');
    expect(STORAGE_KEYS.quickReplies).toBe('quickReplies');
  });
});
