import { useState } from 'react';
import { Plus, Trash2, Edit2, Check } from 'lucide-react';
import type { QuickReply } from '../../types';
import { DEFAULT_QUICK_REPLIES } from '../../constants';

function QuickReplies() {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shortcut, setShortcut] = useState('');
  const [text, setText] = useState('');

  // Load from storage on mount
  useState(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['quickReplies'], (result) => {
        if (result.quickReplies && Array.isArray(result.quickReplies)) {
          setReplies(result.quickReplies);
        } else {
          setReplies(DEFAULT_QUICK_REPLIES);
          chrome.storage.sync.set({ quickReplies: DEFAULT_QUICK_REPLIES });
        }
      });
    } else {
      const local = localStorage.getItem('quickReplies');
      if (local) {
        try { setReplies(JSON.parse(local)); } catch (e) { setReplies(DEFAULT_QUICK_REPLIES); }
      } else {
        setReplies(DEFAULT_QUICK_REPLIES);
        localStorage.setItem('quickReplies', JSON.stringify(DEFAULT_QUICK_REPLIES));
      }
    }
  });

  const persistReplies = (updated: QuickReply[]) => {
    setReplies(updated);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ quickReplies: updated });
    } else {
      localStorage.setItem('quickReplies', JSON.stringify(updated));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanShortcut = shortcut.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanText = text.trim();

    if (!cleanShortcut || !cleanText) return;

    if (editingId) {
      const updated = replies.map(r => r.id === editingId ? { ...r, shortcut: cleanShortcut, text: cleanText } : r);
      persistReplies(updated);
      setEditingId(null);
    } else {
      const newReply: QuickReply = { id: Date.now().toString(), shortcut: cleanShortcut, text: cleanText };
      persistReplies([newReply, ...replies]);
    }

    setShortcut('');
    setText('');
    setIsAdding(false);
  };

  const handleEdit = (reply: QuickReply) => {
    setEditingId(reply.id);
    setShortcut(reply.shortcut);
    setText(reply.text);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    const updated = replies.filter(r => r.id !== id);
    persistReplies(updated);
    if (editingId === id) { setEditingId(null); setShortcut(''); setText(''); setIsAdding(false); }
  };

  return (
    <div className="sidebar-panel-container">
      <div className="sidebar-panel-header">
        <h1>Mensagens Rápidas</h1>
        <button type="button" className="btn-add-card" onClick={() => { setIsAdding(!isAdding); setEditingId(null); setShortcut(''); setText(''); }}>
          <Plus size={14} /> {isAdding ? 'Ver Lista' : 'Nova'}
        </button>
      </div>

      {isAdding ? (
        <form onSubmit={handleSubmit} className="quick-add-form" style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px', fontWeight: 600 }}>Atalho rápido (ex: boasvindas)</div>
          <input type="text" placeholder="boasvindas..." value={shortcut} onChange={(e) => setShortcut(e.target.value)} maxLength={20} required style={{ marginBottom: '8px' }} />

          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px', fontWeight: 600 }}>Conteúdo da mensagem</div>
          <textarea placeholder="Olá! Como posso ajudar você hoje?..." value={text} onChange={(e) => setText(e.target.value)} maxLength={500} required style={{ height: '110px' }} />

          <div className="form-actions" style={{ marginTop: '4px' }}>
            <button type="submit" className="btn-form-action btn-form-confirm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Check size={12} /> {editingId ? 'Salvar Alteração' : 'Criar Mensagem'}
            </button>
            <button type="button" className="btn-form-action btn-form-cancel" onClick={() => { setIsAdding(false); setEditingId(null); setShortcut(''); setText(''); }}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="kanban-columns-container" style={{ gap: '10px' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', lineHeight: 1.4, marginBottom: '4px' }}>
            💡 Digite <strong>/atalho</strong> no chat do WhatsApp ou clique nas tags acima do campo de texto para enviar rapidamente.
          </div>

          {replies.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>
              Nenhuma mensagem cadastrada.
            </div>
          ) : (
            replies.map(reply => (
              <div key={reply.id} className="kanban-card" style={{ cursor: 'default', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#06b6d4', background: 'rgba(6, 182, 212, 0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                    /{reply.shortcut}
                  </span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button type="button" className="btn-card-action" onClick={() => handleEdit(reply)} title="Editar Mensagem"><Edit2 size={11} /></button>
                    <button type="button" className="btn-card-action btn-card-delete" onClick={() => handleDelete(reply.id)} title="Excluir Mensagem"><Trash2 size={11} /></button>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                  {reply.text}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default QuickReplies;
