import { useState, useEffect } from 'react';
import { Paperclip, ChevronUp, ChevronDown } from 'lucide-react';
import type { QuickReply } from '../../types';
import { insertTextWithNewlines, getChatInput } from '../dom-helpers';
import { dispatchAttachmentToWhatsApp } from './quickReplySender';
import { usePagination } from './usePagination';
import AttendantSwitcher from './AttendantSwitcher';

export const SHORTCUTS_PER_PAGE = 5;

function Phrasebar() {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const pagination = usePagination(replies, SHORTCUTS_PER_PAGE);

  // Load and listen to quick replies storage changes
  useEffect(() => {
    const loadReplies = () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['quickReplies'], (result) => {
          if (result.quickReplies && Array.isArray(result.quickReplies)) {
            setReplies(result.quickReplies);
          }
        });
      } else {
        const local = localStorage.getItem('quickReplies');
        if (local) {
          try {
            setReplies(JSON.parse(local));
          } catch (e) {
            console.warn(e);
          }
        }
      }
    };

    loadReplies();

    if (typeof chrome !== 'undefined' && chrome.storage) {
      const listener = (changes: any, areaName: string) => {
        if (areaName === 'sync' && changes.quickReplies) {
          setReplies(changes.quickReplies.newValue || []);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  const handleReplyClick = async (reply: QuickReply) => {
    const inputElement = getChatInput();

    if (!inputElement) {
      console.warn('[La Home Zap] WhatsApp chat input element not found.');
      return;
    }

    try {
      // Use insertTextWithNewlines for full multi-line support
      if (reply.text) {
        insertTextWithNewlines(inputElement, reply.text);
      }

      // If reply has an attached file, dispatch it to WhatsApp chat
      if (reply.attachment) {
        await dispatchAttachmentToWhatsApp(reply.id, reply.attachment);
      }
    } catch (e) {
      console.error('[La Home Zap] Failed to inject quick reply text/attachment:', e);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (pagination.totalPages <= 1) return;
    if (e.deltaY > 0 || e.deltaX > 0) {
      pagination.nextPage();
    } else if (e.deltaY < 0 || e.deltaX < 0) {
      pagination.prevPage();
    }
  };

  return (
    <div
      className="la-home-zap-phrasebar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '6px 12px',
        background: '#1f2c33',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        width: '100%',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* Scrollable / paginated list of short phrases triggers */}
      <div
        onWheel={handleWheel}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'hidden',
          whiteSpace: 'nowrap',
          flexGrow: 1,
        }}
      >
        <span
          style={{
            fontSize: '11px',
            color: '#8696a0',
            fontWeight: 600,
            marginRight: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            flexShrink: 0,
          }}
        >
          ⚡ Atalhos:
        </span>
        {pagination.pageItems.map((reply) => (
          <button
            key={reply.id}
            type="button"
            onClick={() => handleReplyClick(reply)}
            style={{
              background: 'rgba(6, 182, 212, 0.1)',
              color: '#00ced1',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              borderRadius: '100px',
              padding: '4px 10px',
              fontSize: '11.5px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
              outline: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)';
              e.currentTarget.style.borderColor = '#00ced1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.25)';
            }}
          >
            /{reply.shortcut}
            {reply.attachment && <Paperclip size={11} style={{ opacity: 0.85 }} />}
          </button>
        ))}
        {replies.length === 0 && (
          <span style={{ fontSize: '11.5px', color: '#64748b', fontStyle: 'italic' }}>
            Nenhum atalho criado
          </span>
        )}

        {/* Up/Down Pagination Controls on the right side of the shortcuts bar */}
        {pagination.totalPages > 1 && (
          <div
            className="phrasebar-pagination-controls"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '2px 8px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginLeft: '4px',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, minWidth: '22px' }}>
              {pagination.currentPage}/{pagination.totalPages}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
              <button
                type="button"
                onClick={pagination.prevPage}
                disabled={!pagination.canPrev}
                aria-label="Página anterior"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: pagination.canPrev ? '#00ced1' : '#475569',
                  cursor: pagination.canPrev ? 'pointer' : 'default',
                  padding: 0,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pagination.canPrev ? 1 : 0.4,
                  transition: 'color 0.15s ease',
                }}
              >
                <ChevronUp size={13} />
              </button>
              <button
                type="button"
                onClick={pagination.nextPage}
                disabled={!pagination.canNext}
                aria-label="Próxima página"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: pagination.canNext ? '#00ced1' : '#475569',
                  cursor: pagination.canNext ? 'pointer' : 'default',
                  padding: 0,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pagination.canNext ? 1 : 0.4,
                  transition: 'color 0.15s ease',
                }}
              >
                <ChevronDown size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Signature switcher pill */}
      <AttendantSwitcher />
    </div>
  );
}

export default Phrasebar;
