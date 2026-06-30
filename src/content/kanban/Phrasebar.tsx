import { useState, useEffect } from 'react';
import { SELECTORS } from '../../utils/selectors';
import AttendantSwitcher from './AttendantSwitcher';

interface QuickReply {
  id: string;
  shortcut: string;
  text: string;
}

function Phrasebar() {
  const [replies, setReplies] = useState<QuickReply[]>([]);

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

  const handleReplyClick = (text: string) => {
    const inputElement = (document.querySelector(SELECTORS.chatInput) || 
                           document.querySelector(SELECTORS.chatInputFallback)) as HTMLDivElement;

    if (!inputElement) {
      console.warn('[La Home Zap] WhatsApp chat input element not found.');
      return;
    }

    inputElement.focus();
    try {
      // Injects the text cleanly, triggering WhatsApp's internal react event listeners
      document.execCommand('insertText', false, text);
    } catch (e) {
      console.error('[La Home Zap] Failed to inject quick reply text:', e);
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
        background: '#1f2c33', // Matches WhatsApp Web footer color
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        width: '100%',
        flexShrink: 0,
        boxSizing: 'border-box'
      }}
    >
      {/* Scrollable list of short phrases triggers */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
          flexGrow: 1
        }}
      >
        <span style={{ fontSize: '11px', color: '#8696a0', fontWeight: 600, marginRight: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          ⚡ Atalhos:
        </span>
        {replies.map(reply => (
          <button
            key={reply.id}
            type="button"
            onClick={() => handleReplyClick(reply.text)}
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
              outline: 'none'
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
          </button>
        ))}
        {replies.length === 0 && (
          <span style={{ fontSize: '11.5px', color: '#64748b', fontStyle: 'italic' }}>
            Nenhum atalho criado
          </span>
        )}
      </div>

      {/* Signature switcher pill */}
      <AttendantSwitcher />
    </div>
  );
}

export default Phrasebar;
