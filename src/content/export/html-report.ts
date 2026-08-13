/**
 * Printable HTML report builder for exported conversations.
 * Produces a self-contained document with inline CSS so it can be printed,
 * saved or shared without external dependencies.
 */

import type { ExportedMessage, MediaKind } from '../../types';
import { formatDay, formatTime } from './format';

const MEDIA_LABELS: Record<MediaKind, string> = {
  image: '📷 Imagem',
  video: '🎬 Vídeo',
  audio: '🎤 Áudio',
  document: '📄 Documento',
  contact: '👤 Contato',
  location: '📍 Localização',
  sticker: '🖼️ Sticker',
  system: 'ℹ️ Aviso do sistema',
};

/** Escapes user-provided content for safe embedding in HTML. */
export function escapeHtml(text: string): string {
  return (text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Maps a media kind to a human-friendly placeholder label (pt-BR). */
export function mediaLabel(kind: MediaKind): string {
  return MEDIA_LABELS[kind] ?? '📎 Mídia';
}

/** Groups a chronological list of messages into per-day sections. */
export function groupMessagesByDay(
  messages: ExportedMessage[]
): Array<{ dayLabel: string; messages: ExportedMessage[] }> {
  const groups: Array<{ dayLabel: string; messages: ExportedMessage[] }> = [];
  let currentDay: string | null = null;

  for (const message of messages) {
    const dayLabel = formatDay(new Date(message.timestampMs));
    if (dayLabel !== currentDay) {
      currentDay = dayLabel;
      groups.push({ dayLabel, messages: [] });
    }
    groups[groups.length - 1].messages.push(message);
  }

  return groups;
}

export interface ReportMeta {
  exportedAt: Date;
  exportedBy: string;
}

function renderMessageRow(message: ExportedMessage): string {
  const time = formatTime(new Date(message.timestampMs));
  const sender = escapeHtml(message.sender || (message.isOut ? 'Você' : 'Desconhecido'));
  const media = message.media
    ? `<span class="media-marker">${escapeHtml(mediaLabel(message.media))}</span>`
    : '';
  const text = message.body ? `<span class="message-text">${escapeHtml(message.body)}</span>` : '';

  return `
      <div class="message ${message.isOut ? 'message-out' : 'message-in'}">
        <div class="message-meta">
          <span class="message-sender">${sender}</span>
          <span class="message-time">${time}</span>
        </div>
        <div class="message-bubble">${media}${text}</div>
      </div>`;
}

function renderDaySection(group: { dayLabel: string; messages: ExportedMessage[] }): string {
  const rows = group.messages.map(renderMessageRow).join('\n');
  return `
    <div class="day-divider"><span>${escapeHtml(group.dayLabel)}</span></div>
${rows}`;
}

/** Builds the full printable HTML document for a conversation report. */
export function buildHtmlReport(
  chatName: string,
  messages: ExportedMessage[],
  meta: ReportMeta
): string {
  const daySections = groupMessagesByDay(messages).map(renderDaySection).join('\n');
  const exportedAtLabel = `${formatDay(meta.exportedAt)} às ${formatTime(meta.exportedAt)}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(chatName)} — Exportação La Home Zap</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #ffffff; color: #1e293b; padding: 32px; max-width: 860px; margin: 0 auto;
    }
    header.report-header {
      border-bottom: 3px solid #06b6d4; padding-bottom: 16px; margin-bottom: 24px;
    }
    header.report-header h1 { font-size: 26px; font-weight: 800; color: #0f172a; }
    header.report-header p { color: #64748b; font-size: 13px; margin-top: 6px; line-height: 1.5; }
    .day-divider {
      display: flex; align-items: center; margin: 24px 0 12px; gap: 12px;
      color: #0f766e; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    }
    .day-divider::after { content: ""; flex: 1; height: 1px; background: #e2e8f0; }
    .message { margin-bottom: 10px; display: flex; flex-direction: column; }
    .message-meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 3px; }
    .message-sender { font-weight: 700; font-size: 12.5px; color: #0f172a; }
    .message-time { font-size: 11px; color: #94a3b8; }
    .message-bubble {
      display: inline-block; max-width: 100%; padding: 10px 14px; border-radius: 12px;
      font-size: 14px; line-height: 1.5; word-break: break-word; white-space: pre-wrap;
    }
    .message-in .message-bubble { background: #f1f5f9; border-top-left-radius: 4px; }
    .message-out { align-items: flex-end; }
    .message-out .message-meta { flex-direction: row-reverse; }
    .message-out .message-bubble { background: #dcfce7; border-top-right-radius: 4px; }
    .media-marker {
      display: inline-block; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;
      border-radius: 6px; padding: 2px 8px; font-size: 12px; font-weight: 600;
    }
    footer.report-footer {
      margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px;
      font-size: 11px; color: #94a3b8; text-align: center;
    }
    @media print {
      body { padding: 0; max-width: none; }
      .message { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <header class="report-header">
    <h1>${escapeHtml(chatName)}</h1>
    <p>
      Atividade das últimas 24 horas · Gerado em ${escapeHtml(exportedAtLabel)} ·
      Responsável: ${escapeHtml(meta.exportedBy)}
    </p>
  </header>
  <main>
${daySections}
  </main>
  <footer class="report-footer">
    Relatório gerado pela extensão La Home Zap · ${escapeHtml(formatDay(meta.exportedAt))}
  </footer>
</body>
</html>`;
}