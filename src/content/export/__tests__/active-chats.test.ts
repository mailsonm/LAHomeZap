import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseChatlistTime,
  shouldIncludeCandidate,
  scanActiveChatsFromChatlist,
  openChatByName,
  getChatlistRowName,
  areChatNamesMatching,
} from '../active-chats';
import { EXPORT_WINDOW_MS } from '../../../constants';

const NOW = new Date(2026, 7, 5, 15, 0, 0).getTime(); // Aug 5 2026 15:00 local
const WINDOW_MS = EXPORT_WINDOW_MS;

function chatRow(name: string, timeText: string | null, titleAttr?: string): HTMLElement {
  const row = document.createElement('div');
  row.setAttribute('data-testid', 'cell-frame-container');
  row.innerHTML = `
    <span data-testid="chat-title" ${titleAttr ? `title="${titleAttr}"` : ''}>${name}</span>
    ${timeText !== null ? `<span>${timeText}</span>` : ''}
  `;
  return row;
}

describe('active-chats', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('getChatlistRowName', () => {
    it('prioritizes textContent over title attribute when title is phone number', () => {
      const row = chatRow('Mailson Maia', '14:00', '+55 85 9141-7538');
      expect(getChatlistRowName(row)).toBe('Mailson Maia');
    });

    it('falls back to title attribute when textContent is empty', () => {
      const row = document.createElement('div');
      row.innerHTML = `<span data-testid="chat-title" title="Mailson Maia"></span>`;
      expect(getChatlistRowName(row)).toBe('Mailson Maia');
    });
  });

  describe('areChatNamesMatching', () => {
    it('matches identical names', () => {
      expect(areChatNamesMatching('Mailson Maia', 'Mailson Maia')).toBe(true);
    });

    it('matches contact name and phone number digits', () => {
      expect(areChatNamesMatching('+55 85 9141-7538', '558591417538')).toBe(true);
    });

    it('matches substring variations of names', () => {
      expect(areChatNamesMatching('Mailson Maia', 'Mailson Maia (+55 85 9141-7538)')).toBe(true);
    });

    it('returns false for mismatched names', () => {
      expect(areChatNamesMatching('Mailson Maia', 'Outro Contato')).toBe(false);
      expect(areChatNamesMatching(null, 'Mailson')).toBe(false);
    });
  });

  describe('parseChatlistTime', () => {
    it('resolves a 24h time-only value to today at that hour', () => {
      const parsed = parseChatlistTime('14:30', NOW);
      expect(parsed).toEqual({
        timestampMs: new Date(2026, 7, 5, 14, 30, 0).getTime(),
        isAmbiguous: false,
      });
    });

    it('resolves 12h AM/PM time values to today at that hour', () => {
      const NOW_EVENING = new Date(2026, 7, 5, 21, 0, 0).getTime();
      const pmParsed = parseChatlistTime('8:51 PM', NOW_EVENING);
      expect(pmParsed).toEqual({
        timestampMs: new Date(2026, 7, 5, 20, 51, 0).getTime(),
        isAmbiguous: false,
      });

      const amParsed = parseChatlistTime('11:25 AM', NOW_EVENING);
      expect(amParsed).toEqual({
        timestampMs: new Date(2026, 7, 5, 11, 25, 0).getTime(),
        isAmbiguous: false,
      });
    });

    it('treats "Ontem" as ambiguous without an exact time', () => {
      expect(parseChatlistTime('Ontem', NOW)).toEqual({ timestampMs: null, isAmbiguous: true });
    });

    it('returns null for weekdays and dates (older than 24h)', () => {
      expect(parseChatlistTime('sexta-feira', NOW)).toBeNull();
      expect(parseChatlistTime('Friday', NOW)).toBeNull();
      expect(parseChatlistTime('03/08/2026', NOW)).toBeNull();
      expect(parseChatlistTime('', NOW)).toBeNull();
      expect(parseChatlistTime('online', NOW)).toBeNull();
    });
  });

  describe('shouldIncludeCandidate', () => {
    it('includes chats with a recent exact timestamp', () => {
      expect(
        shouldIncludeCandidate(
          { name: 'Maria', timestampMs: NOW - 60_000, isAmbiguous: false },
          NOW,
          WINDOW_MS
        )
      ).toBe(true);
    });

    it('excludes chats with an exact timestamp older than the window', () => {
      expect(
        shouldIncludeCandidate(
          { name: 'Maria', timestampMs: NOW - WINDOW_MS - 1, isAmbiguous: false },
          NOW,
          WINDOW_MS
        )
      ).toBe(false);
    });

    it('keeps ambiguous candidates for verification', () => {
      expect(
        shouldIncludeCandidate({ name: 'Maria', timestampMs: null, isAmbiguous: true }, NOW, WINDOW_MS)
      ).toBe(true);
    });

    it('drops unnamed rows and non-ambiguous empty timestamps', () => {
      expect(
        shouldIncludeCandidate({ name: '', timestampMs: null, isAmbiguous: true }, NOW, WINDOW_MS)
      ).toBe(false);
      expect(
        shouldIncludeCandidate({ name: 'Maria', timestampMs: null, isAmbiguous: false }, NOW, WINDOW_MS)
      ).toBe(false);
    });
  });

  describe('scanActiveChatsFromChatlist', () => {
    it('returns chats with activity inside the 24h window (today 12h/24h or Ontem)', () => {
      const NOW_EVENING = new Date(2026, 7, 5, 21, 0, 0).getTime();
      document.body.appendChild(chatRow('Ana', '8:51 PM'));
      document.body.appendChild(chatRow('Bia', '11:25 AM'));
      document.body.appendChild(chatRow('Carla', 'Ontem'));
      document.body.appendChild(chatRow('Diego', 'sexta-feira'));
      document.body.appendChild(chatRow('Edu', '27/07/2026'));

      const candidates = scanActiveChatsFromChatlist(NOW_EVENING);
      expect(candidates.map((c) => c.name)).toEqual(['Ana', 'Bia', 'Carla']);
    });

    it('detects chats with unread badges as candidates even if time parsing is absent', () => {
      const row = chatRow('UnreadContact', null);
      const unreadSpan = document.createElement('span');
      unreadSpan.setAttribute('aria-label', '1 mensagem não lida');
      row.appendChild(unreadSpan);
      document.body.appendChild(row);

      const candidates = scanActiveChatsFromChatlist(NOW);
      expect(candidates.map((c) => c.name)).toEqual(['UnreadContact']);
    });

    it('ignores rows without a parseable timestamp or unread badge', () => {
      document.body.appendChild(chatRow('Ana', '14:00'));
      document.body.appendChild(chatRow('SemHorario', null));
      document.body.appendChild(chatRow('Online', 'online'));

      const candidates = scanActiveChatsFromChatlist(NOW);
      expect(candidates.map((c) => c.name)).toEqual(['Ana']);
    });
  });

  describe('openChatByName', () => {
    it('dispatches the native click sequence on the matching row and reports success', () => {
      const row = chatRow('Maria', '14:00');
      const click = vi.spyOn(row, 'click');
      let clickDispatched = false;
      row.addEventListener('click', () => {
        clickDispatched = true;
      });
      document.body.appendChild(row);

      expect(openChatByName('Maria')).toBe(true);
      expect(click).not.toHaveBeenCalled();
      expect(clickDispatched).toBe(true);
    });

    it('returns false when the chat is not present', () => {
      document.body.appendChild(chatRow('Maria', '14:00'));
      expect(openChatByName('Outra')).toBe(false);
    });
  });
});