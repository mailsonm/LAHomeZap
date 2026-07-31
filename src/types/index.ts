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
