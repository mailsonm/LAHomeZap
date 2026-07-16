import { describe, it, expect, beforeEach } from 'vitest';
import { getActiveAttendantFromDOM } from '../collision';
import type { Attendant } from '../../types';

describe('collision - getActiveAttendantFromDOM', () => {
  const mockAttendants: Attendant[] = [
    {
      id: '1',
      name: 'Mailson',
      isFavorite: true,
      quebraLinha: true,
      negrito: true,
    },
    {
      id: '2',
      name: 'Thalya',
      isFavorite: false,
      quebraLinha: true,
      negrito: true,
    }
  ];

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should return null if no label button is found', () => {
    expect(getActiveAttendantFromDOM(mockAttendants)).toBeNull();
  });

  it('should return null if label button contains default text', () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-testid', 'label-chat-header-button');
    btn.innerText = 'Etiquetas';
    document.body.appendChild(btn);

    expect(getActiveAttendantFromDOM(mockAttendants)).toBeNull();
  });

  it('should return attendant name if button text matches registered attendant', () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-testid', 'label-chat-header-button');
    btn.innerText = 'Mailson';
    document.body.appendChild(btn);

    expect(getActiveAttendantFromDOM(mockAttendants)).toBe('Mailson');
  });

  it('should return attendant name if button text ends with colon', () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-testid', 'label-chat-header-button');
    btn.innerText = 'Thalya:';
    document.body.appendChild(btn);

    expect(getActiveAttendantFromDOM(mockAttendants)).toBe('Thalya');
  });

  it('should return null if button text is a generic label not matching any attendant', () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-testid', 'label-chat-header-button');
    btn.innerText = 'Adicionar à lista';
    document.body.appendChild(btn);

    expect(getActiveAttendantFromDOM(mockAttendants)).toBeNull();
  });

  it('should return attendant name for unregistered attendant if button text ends with colon', () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-testid', 'label-chat-header-button');
    btn.innerText = 'Unregistered:';
    document.body.appendChild(btn);

    expect(getActiveAttendantFromDOM(mockAttendants)).toBe('Unregistered');
  });
});
