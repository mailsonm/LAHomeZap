import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Star, Plus, Trash2, Check, Eye } from 'lucide-react';
import type { Attendant, Settings } from '../types';
import { DEFAULT_ATTENDANTS, DEFAULT_SETTINGS } from '../constants';
import './options.css';

function App() {
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  // Load initial settings and attendants
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['attendants', 'settings'], (result) => {
        if (result.attendants && Array.isArray(result.attendants) && result.attendants.length > 0) {
          setAttendants(result.attendants);
        } else {
          setAttendants(DEFAULT_ATTENDANTS);
          chrome.storage.sync.set({ attendants: DEFAULT_ATTENDANTS });
        }

        if (result.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...result.settings });
        } else {
          setSettings(DEFAULT_SETTINGS);
          chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
        }
      });
    } else {
      const localAttendants = localStorage.getItem('attendants');
      const localSettings = localStorage.getItem('settings');

      if (localAttendants) {
        try { setAttendants(JSON.parse(localAttendants)); } catch { setAttendants(DEFAULT_ATTENDANTS); }
      } else {
        setAttendants(DEFAULT_ATTENDANTS);
      }

      if (localSettings) {
        try { setSettings(JSON.parse(localSettings)); } catch { setSettings(DEFAULT_SETTINGS); }
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    }
  }, []);

  // Autofocus the input when user clicks "Novo"
  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  // Helper function to trigger save feedback and update storage
  const persistData = (newAttendants: Attendant[], newSettings: Settings) => {
    setSaveStatus('saving');

    // Sync activeAttendant whenever attendants list changes
    const favorite = newAttendants.find(a => a.isFavorite);
    const storageData: Record<string, unknown> = {
      attendants: newAttendants,
      settings: newSettings,
    };
    if (favorite) {
      storageData.activeAttendant = favorite.name;
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set(storageData, () => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      });
    } else {
      localStorage.setItem('attendants', JSON.stringify(newAttendants));
      localStorage.setItem('settings', JSON.stringify(newSettings));
      if (favorite) {
        localStorage.setItem('activeAttendant', favorite.name);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleCheckboxChange = (key: keyof Settings) => {
    const updatedSettings = { ...settings, [key]: !settings[key] };
    setSettings(updatedSettings);
    persistData(attendants, updatedSettings);
  };

  const handleAddAttendant = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    if (!cleanName) return;

    // Check if name already exists
    if (attendants.some(a => a.name.toLowerCase() === cleanName.toLowerCase())) {
      alert('Já existe um atendente com este nome.');
      return;
    }

    const newAttendant: Attendant = {
      id: Date.now().toString(),
      name: cleanName,
      isFavorite: attendants.length === 0,
      // Default formatting flags for options page-created attendants
      quebraLinha: true,
      negrito: true,
    };

    const updatedList = [...attendants, newAttendant];
    setAttendants(updatedList);
    setNewName('');
    setIsAdding(false);
    persistData(updatedList, settings);
  };

  const handleDeleteAttendant = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const target = attendants.find(a => a.id === id);
    if (!target) return;

    if (attendants.length === 1) {
      alert('Você deve manter pelo menos um atendente cadastrado.');
      return;
    }

    const updatedList = attendants.filter(a => a.id !== id);

    if (target.isFavorite && updatedList.length > 0) {
      updatedList[0].isFavorite = true;
    }

    setAttendants(updatedList);
    persistData(updatedList, settings);
  };

  const handleSetFavorite = (id: string) => {
    const updatedList = attendants.map(a => ({
      ...a,
      isFavorite: a.id === id
    }));
    setAttendants(updatedList);
    persistData(updatedList, settings);
  };

  return (
    <div className="container">
      {/* Auto-save Status indicator in the top corner */}
      <div className={`autosave-indicator ${saveStatus === 'saved' ? 'saved' : ''}`}>
        {saveStatus === 'saving' && 'Salvando...'}
        {saveStatus === 'saved' && (
          <>
            <Check size={12} />
            Salvo automaticamente
          </>
        )}
      </div>

      <header>
        <div className="header-top">
          <div className="logo-section">
            <div className="logo-icon">
              <MessageSquare size={20} />
            </div>
            <h1>Nome Personalizado</h1>
          </div>
          <a
            href="https://youtu.be/exlWzf-Y4O4"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-tutorial"
          >
            <Eye size={14} />
            Ver Tutorial
          </a>
        </div>
      </header>

      {/* Global Config Toggles Section */}
      <section className="settings-section">
        <div className="checkbox-grid">
          <label className="checkbox-item">
            <input type="checkbox" checked={settings.quickAccess} onChange={() => handleCheckboxChange('quickAccess')} />
            <div className="checkbox-label-wrapper">
              <span className="checkbox-title">Acesso rápido + atalho.</span>
            </div>
          </label>

          <label className="checkbox-item">
            <input type="checkbox" checked={settings.capitalizeInitial} onChange={() => handleCheckboxChange('capitalizeInitial')} />
            <div className="checkbox-label-wrapper">
              <span className="checkbox-title">Letra inicial maiúscula.</span>
            </div>
          </label>

          <label className="checkbox-item">
            <input type="checkbox" checked={settings.transferAlert} onChange={() => handleCheckboxChange('transferAlert')} />
            <div className="checkbox-label-wrapper">
              <span className="checkbox-title">Receber alerta de Transferência.</span>
            </div>
          </label>

          <label className="checkbox-item">
            <input type="checkbox" checked={settings.dontRepeatInChat} onChange={() => handleCheckboxChange('dontRepeatInChat')} />
            <div className="checkbox-label-wrapper">
              <span className="checkbox-title">Não repetir no chat.</span>
            </div>
          </label>

          <label className="checkbox-item">
            <input type="checkbox" checked={settings.attendanceControl} onChange={() => handleCheckboxChange('attendanceControl')} />
            <div className="checkbox-label-wrapper">
              <span className="checkbox-title">Controle de Atendimento.</span>
            </div>
          </label>
        </div>
      </section>

      {/* Attendants Manager Grid Section */}
      <section className="attendants-section">
        <h2>Atendentes Cadastrados</h2>
        <div className="attendants-grid">
          {/* Card Add New */}
          {!isAdding ? (
            <div className="attendant-card card-add" onClick={() => setIsAdding(true)}>
              <div className="add-content">
                <div className="add-icon-wrapper">
                  <Plus size={16} />
                </div>
                <span className="add-label">Novo</span>
              </div>
            </div>
          ) : (
            <div className="attendant-card">
              <form onSubmit={handleAddAttendant} className="add-form-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Nome do atendente"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input-add-name"
                  maxLength={30}
                  required
                />
                <div className="form-actions">
                  <button type="submit" className="btn-form-action btn-form-confirm">
                    Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setNewName('');
                    }}
                    className="btn-form-action btn-form-cancel"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Attendant Cards List */}
          {attendants.map((attendant, index) => (
            <div
              key={attendant.id}
              className={`attendant-card ${attendant.isFavorite ? 'active' : ''}`}
              onClick={() => handleSetFavorite(attendant.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-header">
                <span className="attendant-index">{index + 1}º</span>
                <button
                  type="button"
                  className={`btn-star ${attendant.isFavorite ? 'favorited' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetFavorite(attendant.id);
                  }}
                  title={attendant.isFavorite ? 'Atendente Ativo' : 'Definir como Ativo'}
                >
                  <Star size={16} fill={attendant.isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>

              <div className="card-body">
                <div className="attendant-avatar">
                  {attendant.name.charAt(0).toUpperCase()}
                </div>
                <div className="attendant-name" title={attendant.name}>
                  {attendant.name}
                </div>
              </div>

              <div className="card-footer">
                <button
                  type="button"
                  className="btn-delete"
                  onClick={(e) => handleDeleteAttendant(attendant.id, e)}
                  title="Excluir Atendente"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer>
        <p>La Home Care &bull; WhatsApp Web Integration</p>
      </footer>
    </div>
  );
}

export default App;
