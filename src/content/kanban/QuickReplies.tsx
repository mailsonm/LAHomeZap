import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, Paperclip, FileText, Image as ImageIcon, X, Send } from 'lucide-react';
import type { QuickReply, QuickReplyAttachment } from '../../types';
import { DEFAULT_QUICK_REPLIES } from '../../constants';
import { storageLocalGet, storageLocalSet, storageLocalRemove } from '../../utils/storage';
import { dispatchAttachmentToWhatsApp } from './quickReplySender';
import { getChatInput, insertTextWithNewlines } from '../dom-helpers';

const MAX_CHARACTERS = 4000;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function QuickReplies() {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shortcut, setShortcut] = useState('');
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<QuickReplyAttachment | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Load from storage on mount
  useEffect(() => {
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
  }, []);

  const persistReplies = (updated: QuickReply[]) => {
    // Strip dataUrl before syncing to avoid chrome.storage.sync quota limits
    const sanitizedReplies = updated.map(r => {
      if (r.attachment) {
        const { dataUrl, ...cleanAtt } = r.attachment;
        void dataUrl; // dataUrl is intentionally stripped before syncing
        return { ...r, attachment: cleanAtt };
      }
      return r;
    });

    setReplies(sanitizedReplies);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ quickReplies: sanitizedReplies });
    } else {
      localStorage.setItem('quickReplies', JSON.stringify(sanitizedReplies));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError('O arquivo deve ter no máximo 5MB.');
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Formato inválido. Use apenas Imagens (PNG/JPG) ou PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAttachment({
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanShortcut = shortcut.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanText = text.trim();

    if (!cleanShortcut || !cleanText) return;

    const targetId = editingId || Date.now().toString();

    if (attachment && attachment.dataUrl) {
      await storageLocalSet(`attachment_${targetId}`, attachment.dataUrl);
    } else if (!attachment && editingId) {
      await storageLocalRemove(`attachment_${editingId}`);
    }

    const newAttachmentMeta = attachment
      ? { id: attachment.id, name: attachment.name, type: attachment.type, size: attachment.size }
      : undefined;

    if (editingId) {
      const updated = replies.map(r => r.id === editingId ? { ...r, shortcut: cleanShortcut, text: cleanText, attachment: newAttachmentMeta } : r);
      persistReplies(updated);
      setEditingId(null);
    } else {
      const newReply: QuickReply = {
        id: targetId,
        shortcut: cleanShortcut,
        text: cleanText,
        attachment: newAttachmentMeta,
      };
      persistReplies([newReply, ...replies]);
    }

    setShortcut('');
    setText('');
    setAttachment(null);
    setUploadError(null);
    setIsAdding(false);
  };

  const handleEdit = async (reply: QuickReply) => {
    setEditingId(reply.id);
    setShortcut(reply.shortcut);
    setText(reply.text);

    if (reply.attachment) {
      const storedDataUrl = await storageLocalGet<string>(`attachment_${reply.id}`);
      setAttachment({
        ...reply.attachment,
        dataUrl: storedDataUrl,
      });
    } else {
      setAttachment(null);
    }
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    const updated = replies.filter(r => r.id !== id);
    persistReplies(updated);
    await storageLocalRemove(`attachment_${id}`);

    if (editingId === id) {
      setEditingId(null);
      setShortcut('');
      setText('');
      setAttachment(null);
      setIsAdding(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSendToChat = async (reply: QuickReply) => {
    const inputElement = getChatInput();
    if (inputElement && reply.text) {
      try {
        insertTextWithNewlines(inputElement, reply.text);
      } catch (e) {
        console.error('[La Home Zap] Failed to inject quick reply text:', e);
      }
    }
    if (reply.attachment) {
      await dispatchAttachmentToWhatsApp(reply.id, reply.attachment);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="sidebar-panel-container">
      <div className="sidebar-panel-header">
        <h1>Mensagens Rápidas</h1>
        <button type="button" className="btn-add-card" onClick={() => { setIsAdding(!isAdding); setEditingId(null); setShortcut(''); setText(''); setAttachment(null); setUploadError(null); }}>
          <Plus size={14} /> {isAdding ? 'Ver Lista' : 'Nova'}
        </button>
      </div>

      {isAdding ? (
        <form onSubmit={handleSubmit} className="quick-add-form" style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px', fontWeight: 600 }}>Atalho rápido (ex: boasvindas)</div>
          <input type="text" placeholder="boasvindas..." value={shortcut} onChange={(e) => setShortcut(e.target.value)} maxLength={20} required style={{ marginBottom: '8px' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Conteúdo da mensagem</span>
            <span style={{ fontSize: '10px', color: text.length >= MAX_CHARACTERS ? '#ef4444' : '#64748b' }}>
              {text.length}/{MAX_CHARACTERS}
            </span>
          </div>
          <textarea
            placeholder="Olá! Como posso ajudar você hoje?..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_CHARACTERS}
            required
            style={{ height: '110px' }}
          />

          <div style={{ marginTop: '8px', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Paperclip size={12} /> Anexo (Opcional - PDF ou Imagem até 5MB)
            </div>

            {attachment ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', color: '#e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  {attachment.type.includes('pdf') ? <FileText size={14} color="#06b6d4" /> : <ImageIcon size={14} color="#06b6d4" />}
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                    {attachment.name}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>({formatFileSize(attachment.size)})</span>
                </div>
                <button type="button" onClick={removeAttachment} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '6px', color: '#cbd5e1', fontSize: '11px', cursor: 'pointer' }}>
                <Paperclip size={12} /> Selecionar PDF ou Imagem
                <input type="file" accept="image/png,image/jpeg,image/jpg,application/pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            )}

            {uploadError && (
              <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                {uploadError}
              </div>
            )}
          </div>

          <div className="form-actions" style={{ marginTop: '6px' }}>
            <button type="submit" className="btn-form-action btn-form-confirm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Check size={12} /> {editingId ? 'Salvar Alteração' : 'Criar Mensagem'}
            </button>
            <button type="button" className="btn-form-action btn-form-cancel" onClick={() => { setIsAdding(false); setEditingId(null); setShortcut(''); setText(''); setAttachment(null); setUploadError(null); }}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="kanban-columns-container" style={{ gap: '10px' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', lineHeight: 1.4, marginBottom: '4px' }}>
            💡 Digite <strong>/atalho</strong> no chat do WhatsApp ou clique em <strong>Enviar</strong> para aplicar a mensagem e carregar o anexo.
          </div>

          {replies.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>
              Nenhuma mensagem cadastrada.
            </div>
          ) : (
            replies.map(reply => {
              const isExpanded = expandedIds[reply.id];
              const isLongText = reply.text.length > 180;
              const displayText = isLongText && !isExpanded ? `${reply.text.substring(0, 180)}...` : reply.text;

              return (
                <div key={reply.id} className="kanban-card" style={{ cursor: 'default', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#06b6d4', background: 'rgba(6, 182, 212, 0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                      /{reply.shortcut}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {reply.attachment && (
                        <button
                          type="button"
                          className="btn-card-action"
                          onClick={() => handleSendToChat(reply)}
                          title="Enviar anexo no Chat"
                          style={{ color: '#06b6d4' }}
                        >
                          <Send size={11} />
                        </button>
                      )}
                      <button type="button" className="btn-card-action" onClick={() => handleEdit(reply)} title="Editar Mensagem"><Edit2 size={11} /></button>
                      <button type="button" className="btn-card-action btn-card-delete" onClick={() => handleDelete(reply.id)} title="Excluir Mensagem"><Trash2 size={11} /></button>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {displayText}
                  </div>

                  {isLongText && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(reply.id)}
                      style={{ background: 'none', border: 'none', color: '#06b6d4', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0, textAlign: 'left' }}
                    >
                      {isExpanded ? 'Recolher' : 'Ver mais...'}
                    </button>
                  )}

                  {reply.attachment && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 8px', borderRadius: '6px', fontSize: '10.5px', color: '#94a3b8' }}>
                      {reply.attachment.type.includes('pdf') ? <FileText size={12} color="#06b6d4" /> : <ImageIcon size={12} color="#06b6d4" />}
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                        {reply.attachment.name}
                      </span>
                      <span style={{ fontSize: '9.5px', color: '#64748b' }}>
                        {formatFileSize(reply.attachment.size)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default QuickReplies;
