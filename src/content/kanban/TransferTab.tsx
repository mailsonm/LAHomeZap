import { useState } from 'react';
import { ArrowRightLeft, User2, MessageSquare } from 'lucide-react';
import type { Attendant } from '../../types';
import { getActiveChatName } from '../dom-helpers';
import { useInterval } from '../../hooks/useInterval';

function TransferTab() {
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [loadingAttendantId, setLoadingAttendantId] = useState<string | null>(null);

  // Poll for active chat name changes dynamically (with auto cleanup via useInterval)
  useInterval(() => {
    setActiveChat(getActiveChatName());
  }, 1000);

  // Load attendants from storage
  useState(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['attendants'], (result) => {
        if (result.attendants && Array.isArray(result.attendants)) {
          setAttendants(result.attendants);
        }
      });
    } else {
      const local = localStorage.getItem('attendants');
      if (local) {
        try { setAttendants(JSON.parse(local)); } catch (e) { console.warn(e); }
      }
    }
  });

  const handleTransfer = (target: Attendant) => {
    if (!activeChat) return;

    setLoadingAttendantId(target.id);

    const transferEvent = new CustomEvent('la-home-zap-transfer-chat', {
      detail: { targetAttendant: target.name, reason: reason.trim(), chatName: activeChat }
    });

    window.dispatchEvent(transferEvent);

    setTimeout(() => {
      setLoadingAttendantId(null);
      setReason('');
    }, 1200);
  };

  return (
    <div className="sidebar-panel-container">
      <div className="sidebar-panel-header">
        <h1>Transferir Chat</h1>
      </div>

      {activeChat ? (
        <div className="kanban-columns-container" style={{ gap: '12px' }}>
          <div style={{ background: 'rgba(6, 182, 212, 0.04)', border: '1px solid rgba(6, 182, 212, 0.1)', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#06b6d4', fontWeight: 700, letterSpacing: '0.5px' }}>Conversa Selecionada</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>{activeChat}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MessageSquare size={12} />
              Motivo/Observação da Transferência (Opcional)
            </label>
            <textarea placeholder="Favor dar andamento na liberação..." value={reason} onChange={(e) => setReason(e.target.value)} maxLength={150} style={{ width: '100%', height: '70px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f8fafc', padding: '8px', fontSize: '12px', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Transferir Para:</div>

            {attendants.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>
                Nenhum atendente cadastrado nas Opções da extensão.
              </div>
            ) : (
              attendants.map(attendant => (
                <div key={attendant.id} className="kanban-card" style={{ cursor: 'default', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                      <User2 size={14} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#f8fafc' }}>{attendant.name}</span>
                  </div>

                  <button type="button" className="btn-add-card" disabled={loadingAttendantId !== null} onClick={() => handleTransfer(attendant)} style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.2)', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: '4px', cursor: loadingAttendantId !== null ? 'not-allowed' : 'pointer' }}>
                    {loadingAttendantId === attendant.id ? 'Enviando...' : (<><ArrowRightLeft size={10} /> Transferir</>)}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: '#475569', fontSize: '12.5px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.03)', borderRadius: '12px' }}>
          Selecione uma conversa no WhatsApp Web para liberar as opções de transferência.
        </div>
      )}
    </div>
  );
}

export default TransferTab;
