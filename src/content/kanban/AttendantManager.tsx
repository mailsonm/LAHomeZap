import { useState, useEffect } from 'react';
import { Plus, Star, Check, Trash2, X } from 'lucide-react';

interface Attendant {
  id: string;
  name: string;
  isFavorite: boolean;
  quebraLinha?: boolean;
  negrito?: boolean;
  italico?: boolean;
  moldura?: boolean;
  destaque?: boolean;
}

interface Settings {
  quickAccess: boolean;
  transferAlert: boolean;
  attendanceControl: boolean;
  capitalizeInitial: boolean;
  dontRepeatInChat: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  quickAccess: true,
  transferAlert: false,
  attendanceControl: true,
  capitalizeInitial: true,
  dontRepeatInChat: false
};

function AttendantManager() {
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  
  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [quebraLinha, setQuebraLinha] = useState(true);
  const [negrito, setNegrito] = useState(true);
  const [italico, setItalico] = useState(false);
  const [moldura, setMoldura] = useState(false);
  const [destaque, setDestaque] = useState(false);

  // Load configuration and listen to changes
  useEffect(() => {
    const loadConfig = () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['attendants', 'settings'], (result) => {
          if (result.attendants && Array.isArray(result.attendants)) {
            setAttendants(result.attendants);
          }
          if (result.settings) {
            setSettings({ ...DEFAULT_SETTINGS, ...result.settings });
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
        const localSettings = localStorage.getItem('settings');
        if (localSettings) {
          try {
            setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(localSettings) });
          } catch (e) {
            console.warn(e);
          }
        }
      }
    };

    loadConfig();
  }, []);

  const saveToStorage = (updatedAttendants: Attendant[], updatedSettings?: Settings) => {
    const currentSettings = updatedSettings || settings;
    
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      const data: any = { attendants: updatedAttendants, settings: currentSettings };
      
      // Update activeAttendant string key based on favorite
      const favorite = updatedAttendants.find(a => a.isFavorite);
      if (favorite) {
        data.activeAttendant = favorite.name;
      }
      
      chrome.storage.sync.set(data);
    } else {
      localStorage.setItem('attendants', JSON.stringify(updatedAttendants));
      localStorage.setItem('settings', JSON.stringify(currentSettings));
      const favorite = updatedAttendants.find(a => a.isFavorite);
      if (favorite) {
        localStorage.setItem('activeAttendant', favorite.name);
      }
    }
  };

  const handleSettingChange = (key: keyof Settings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveToStorage(attendants, updated);
  };

  const handleEditClick = (att: Attendant) => {
    setEditingId(att.id);
    setName(att.name);
    setQuebraLinha(att.quebraLinha !== false);
    setNegrito(att.negrito !== false);
    setItalico(!!att.italico);
    setMoldura(!!att.moldura);
    setDestaque(!!att.destaque);
    setIsEditing(true);
  };

  const handleAddNewClick = () => {
    setEditingId(null);
    setName('');
    setQuebraLinha(true);
    setNegrito(true);
    setItalico(false);
    setMoldura(false);
    setDestaque(false);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    let updatedList: Attendant[] = [];

    if (editingId) {
      // Edit existing
      updatedList = attendants.map(a => 
        a.id === editingId 
          ? { ...a, name: cleanName, quebraLinha, negrito, italico, moldura, destaque } 
          : a
      );
    } else {
      // Add new
      const isFirst = attendants.length === 0;
      const newAtt: Attendant = {
        id: Date.now().toString(),
        name: cleanName,
        isFavorite: isFirst, // First attendant is automatically favorite
        quebraLinha,
        negrito,
        italico,
        moldura,
        destaque
      };
      updatedList = [...attendants, newAtt];
    }

    setAttendants(updatedList);
    saveToStorage(updatedList);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const attToDelete = attendants.find(a => a.id === id);
    let updatedList = attendants.filter(a => a.id !== id);

    // If deleted the favorite one, assign favorite to first remaining
    if (attToDelete?.isFavorite && updatedList.length > 0) {
      updatedList[0].isFavorite = true;
    }

    setAttendants(updatedList);
    saveToStorage(updatedList);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleToggleFavorite = (id: string) => {
    const updatedList = attendants.map(a => ({
      ...a,
      isFavorite: a.id === id
    }));
    setAttendants(updatedList);
    saveToStorage(updatedList);
  };

  return (
    <div className="sidebar-panel-container">
      <div className="sidebar-panel-header">
        <h1>Nome Personalizado</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, paddingRight: '4px', scrollbarWidth: 'thin' }}>
        
        {/* Global Settings Section */}
        <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
            Opções Globais
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#e2e8f0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.quickAccess}
              onChange={(e) => handleSettingChange('quickAccess', e.target.checked)}
              style={{ accentColor: '#06b6d4' }}
            />
            Acesso rápido + atalho
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#e2e8f0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.capitalizeInitial}
              onChange={(e) => handleSettingChange('capitalizeInitial', e.target.checked)}
              style={{ accentColor: '#06b6d4' }}
            />
            Letra inicial maiúscula
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#e2e8f0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.transferAlert}
              onChange={(e) => handleSettingChange('transferAlert', e.target.checked)}
              style={{ accentColor: '#06b6d4' }}
            />
            Receber alerta de Transferência
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#e2e8f0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.dontRepeatInChat}
              onChange={(e) => handleSettingChange('dontRepeatInChat', e.target.checked)}
              style={{ accentColor: '#06b6d4' }}
            />
            Não repetir no chat
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#e2e8f0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.attendanceControl}
              onChange={(e) => handleSettingChange('attendanceControl', e.target.checked)}
              style={{ accentColor: '#06b6d4' }}
            />
            Controle de Atendimento
          </label>
        </div>

        {/* Form and List rendering switch */}
        {isEditing ? (
          <form onSubmit={handleSave} className="quick-add-form" style={{ background: 'rgba(15, 23, 42, 0.4)', marginTop: 0 }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Nome do Atendente</div>
            <input
              type="text"
              placeholder="Mailson..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={25}
              required
              style={{ marginBottom: '12px' }}
            />

            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Formatação da Assinatura</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={quebraLinha}
                  onChange={(e) => setQuebraLinha(e.target.checked)}
                  style={{ accentColor: '#06b6d4' }}
                />
                Quebra linha
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={negrito}
                  onChange={(e) => setNegrito(e.target.checked)}
                  style={{ accentColor: '#06b6d4' }}
                />
                Negrito
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={italico}
                  onChange={(e) => setItalico(e.target.checked)}
                  style={{ accentColor: '#06b6d4' }}
                />
                Itálico
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={moldura}
                  onChange={(e) => setMoldura(e.target.checked)}
                  style={{ accentColor: '#06b6d4' }}
                />
                Moldura
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', gridColumn: 'span 2' }}>
                <input
                  type="checkbox"
                  checked={destaque}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setDestaque(val);
                    if (val) {
                      setQuebraLinha(true); // Destaque requires newline
                    }
                  }}
                  style={{ accentColor: '#06b6d4' }}
                />
                Destaque (Citação &gt;)
              </label>
            </div>

            <div className="form-actions" style={{ display: 'flex', gap: '6px' }}>
              <button type="submit" className="btn-form-action btn-form-confirm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flexGrow: 1 }}>
                <Check size={12} />
                Salvar
              </button>
              
              {editingId && (
                <button
                  type="button"
                  className="btn-form-action btn-form-cancel"
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                  onClick={() => handleDelete(editingId)}
                  title="Excluir Atendente"
                >
                  <Trash2 size={12} />
                </button>
              )}

              <button
                type="button"
                className="btn-form-action btn-form-cancel"
                onClick={() => {
                  setIsEditing(false);
                  setEditingId(null);
                }}
              >
                <X size={12} />
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Atendentes Cadastrados
              </span>
              <button
                type="button"
                className="btn-add-card"
                onClick={handleAddNewClick}
                style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                <Plus size={11} />
                Novo
              </button>
            </div>

            {/* Grid list of attendants */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {attendants.length === 0 ? (
                <div style={{ gridColumn: 'span 2', padding: '24px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>
                  Nenhum atendente cadastrado. Clique em Novo para criar.
                </div>
              ) : (
                attendants.map((att, idx) => (
                  <div
                    key={att.id}
                    className={`kanban-card ${att.isFavorite ? 'att-favorite' : ''}`}
                    onClick={() => handleEditClick(att)}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px 8px',
                      background: att.isFavorite ? 'rgba(6, 182, 212, 0.05)' : 'rgba(255,255,255,0.01)',
                      border: att.isFavorite ? '1px solid rgba(6, 182, 212, 0.25)' : '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '12px',
                      position: 'relative',
                      textAlign: 'center',
                      minHeight: '100px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = att.isFavorite ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    {/* Favorite Trigger (Click star directly toggles favorite) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Avoid opening editor
                        handleToggleFavorite(att.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: att.isFavorite ? '#eab308' : 'rgba(255,255,255,0.15)',
                        outline: 'none',
                        padding: '2px'
                      }}
                      title={att.isFavorite ? 'Atendente Ativo (Principal)' : 'Definir como Atendente Ativo'}
                    >
                      <Star size={13} fill={att.isFavorite ? '#eab308' : 'transparent'} />
                    </button>

                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: att.isFavorite ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: att.isFavorite ? '#06b6d4' : '#94a3b8', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>
                        {att.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                      {att.name}
                    </div>
                    
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                      {idx + 1}º da lista
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendantManager;
