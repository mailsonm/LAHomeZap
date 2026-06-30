import { useState, useEffect, useRef } from 'react';
import { User, ChevronUp } from 'lucide-react';

interface Attendant {
  id: string;
  name: string;
  isFavorite: boolean;
}

function AttendantSwitcher() {
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [activeAttendant, setActiveAttendant] = useState<string>('Coordenação');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load configuration and listen to changes
  useEffect(() => {
    const loadConfig = () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['attendants', 'activeAttendant'], (result) => {
          if (result.attendants && Array.isArray(result.attendants)) {
            setAttendants(result.attendants);
          }
          if (result.activeAttendant) {
            setActiveAttendant(result.activeAttendant);
          }
        });
      } else {
        const localAtts = localStorage.getItem('attendants');
        if (localAtts) {
          try {
            setAttendants(JSON.parse(localAtts));
          } catch (e) {
            console.warn(e);
          }
        }
        const localActive = localStorage.getItem('activeAttendant');
        if (localActive) {
          setActiveAttendant(localActive);
        }
      }
    };

    loadConfig();

    if (typeof chrome !== 'undefined' && chrome.storage) {
      const listener = (changes: any, areaName: string) => {
        if (areaName === 'sync') {
          if (changes.activeAttendant) {
            setActiveAttendant(changes.activeAttendant.newValue);
          }
          if (changes.attendants) {
            setAttendants(changes.attendants.newValue || []);
          }
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleAttendantSelect = (name: string) => {
    setActiveAttendant(name);
    setIsOpen(false);

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ activeAttendant: name });
    } else {
      localStorage.setItem('activeAttendant', name);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      {/* Active Attendant Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          color: '#e2e8f0',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '100px',
          padding: '4px 12px',
          fontSize: '11.5px',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.15s ease',
          outline: 'none',
          userSelect: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        }}
      >
        <User size={11} style={{ color: '#06b6d4' }} />
        <span>Assinatura: <strong>{activeAttendant}</strong></span>
        <ChevronUp size={10} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {/* Upward Sliding Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: '8px',
            background: '#1f2c33', // Dark theme matching WhatsApp input container
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.5)',
            minWidth: '150px',
            padding: '6px 4px',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            animation: 'slideUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{ fontSize: '10px', color: '#8696a0', padding: '2px 8px 6px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
            Alterar Assinatura
          </div>
          {attendants.length === 0 ? (
            <button
              type="button"
              onClick={() => handleAttendantSelect('Coordenação')}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: activeAttendant === 'Coordenação' ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: activeAttendant === 'Coordenação' ? '#00ced1' : '#e2e8f0',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                outline: 'none',
                fontWeight: activeAttendant === 'Coordenação' ? 600 : 400
              }}
            >
              Coordenação
            </button>
          ) : (
            attendants.map(att => (
              <button
                key={att.id}
                type="button"
                onClick={() => handleAttendantSelect(att.name)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: activeAttendant === att.name ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: activeAttendant === att.name ? '#00ced1' : '#e2e8f0',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  outline: 'none',
                  fontWeight: activeAttendant === att.name ? 600 : 400,
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (activeAttendant !== att.name) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeAttendant !== att.name) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {att.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default AttendantSwitcher;
