import type { Settings, QuickReply, Attendant } from '../types';

/**
 * Default settings applied when none are found in storage.
 */
export const DEFAULT_SETTINGS: Settings = {
  quickAccess: true,
  transferAlert: false,
  attendanceControl: true,
  capitalizeInitial: true,
  dontRepeatInChat: false,
};

/**
 * Default attendants applied on first install.
 */
export const DEFAULT_ATTENDANTS: Attendant[] = [
  { id: '1', name: 'Coordenação', isFavorite: true, quebraLinha: true, negrito: true },
];

/**
 * Default quick reply templates.
 */
export const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  { id: '1', shortcut: 'boasvindas', text: 'Olá! Seja bem-vindo à La Home Care. Como posso ajudar você hoje?' },
  { id: '2', shortcut: 'documentos', text: 'Por favor, envie o documento de identificação (RG) e a carteirinha do convênio Hapvida do paciente para prosseguirmos.' },
  { id: '3', shortcut: 'finalizar', text: 'Seu atendimento foi concluído. A La Home Care agradece o contato e deseja um excelente dia!' },
];

/**
 * Fallback attendant name used when no attendants are configured.
 */
export const FALLBACK_ATTENDANT_NAME = 'Coordenação';

/**
 * Default transfer message template.
 */
export const DEFAULT_WELCOME_MESSAGE = (attendantName: string) =>
  `Olá! Sou o atendente *${attendantName}* e vou iniciar seu atendimento na La Home Care. Como posso ajudar você hoje?`;

/**
 * Keys used in chrome.storage.sync / localStorage.
 */
export const STORAGE_KEYS = {
  attendants: 'attendants',
  settings: 'settings',
  activeAttendant: 'activeAttendant',
  activeAttendances: 'activeAttendances',
  kanbanCards: 'kanbanCards',
  quickReplies: 'quickReplies',
} as const;
