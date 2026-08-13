import type { Settings, QuickReply, Attendant, ExportConfig } from '../types';

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
  exportConfig: 'exportConfig',
} as const;

/**
 * Default export configuration (automation disabled, 20:00 every day).
 */
export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  enabled: false,
  hour: 20,
  minute: 0,
};

/**
 * WhatsApp conversations with activity within this window are eligible for export.
 */
export const EXPORT_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Name of the chrome.alarms scheduled for the automatic daily export.
 */
export const EXPORT_ALARM_NAME = 'la-home-zap-daily-export';

/**
 * Runtime message sent from the background service worker to the content script
 * telling it to run the daily export pipeline.
 */
export const EXPORT_MESSAGE_TYPE = 'la-home-zap-run-daily-export';

/**
 * Runtime message sent by the content script to the background service worker
 * asking it to resync the daily export alarm from the current config.
 */
export const EXPORT_SYNC_MESSAGE_TYPE = 'la-home-zap-sync-export-config';

/**
 * Runtime message sent by the content script to the background service worker
 * requesting a file download using chrome.downloads.
 */
export const EXPORT_DOWNLOAD_MESSAGE_TYPE = 'la-home-zap-download-export-file';

/**
 * Subdirectory (inside the browser Downloads folder) used for exported reports.
 */
export const EXPORT_DOWNLOAD_SUBDIR = 'LaHomeZap';

