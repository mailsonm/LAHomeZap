/**
 * Centralized type definitions for the La Home Zap extension.
 * All components and modules should import from here to ensure consistency.
 */

export interface Attendant {
  id: string;
  name: string;
  isFavorite: boolean;
  /** Adds a newline after the signature */
  quebraLinha?: boolean;
  /** Wraps name in bold markdown (*name*) */
  negrito?: boolean;
  /** Wraps name in italic markdown (_name_) */
  italico?: boolean;
  /** Wraps name in brackets ([name]) */
  moldura?: boolean;
  /** Prepends blockquote ( > name) */
  destaque?: boolean;
}

export interface Settings {
  quickAccess: boolean;
  transferAlert: boolean;
  attendanceControl: boolean;
  capitalizeInitial: boolean;
  dontRepeatInChat: boolean;
}

export interface QuickReplyAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
}

export interface QuickReply {
  id: string;
  shortcut: string;
  text: string;
  attachment?: QuickReplyAttachment;
}

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  status: 'new' | 'progress' | 'done';
  createdAt: string;
}

/** Maps chat names to attendant names for in-progress attendances. */
export type ActiveAttendances = Record<string, string>;

/** Kind of media attached to a message, used to render placeholders in exports. */
export type MediaKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'contact'
  | 'location'
  | 'sticker'
  | 'system';

/** A single message extracted from the WhatsApp Web DOM for export. */
export interface ExportedMessage {
  id: string;
  body: string;
  sender: string;
  timestampMs: number;
  isOut: boolean;
  media: MediaKind | null;
  mediaSrc?: string;
  documentName?: string;
  documentSize?: string;
  transcription?: string;
}

/** Pagination state and controls for components such as Phrasebar. */
export interface PaginationState<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  pageItems: T[];
  canNext: boolean;
  canPrev: boolean;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
}

/** Scheduling configuration for the automatic daily export. */
export interface ExportConfig {
  enabled: boolean;
  hour: number;
  minute: number;
}

/** A generated printable HTML report for a single conversation. */
export interface ExportResultFile {
  chatName: string;
  filename: string;
  html: string;
  messageCount: number;
}

/** STT result and status */
export interface STTResult {
  text: string;
  confidence?: number;
  cached?: boolean;
}

