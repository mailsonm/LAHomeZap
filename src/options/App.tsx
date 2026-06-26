import React, { useState, useEffect } from 'react';
import { MessageSquare, Check } from 'lucide-react';
import './options.css';

function App() {
  const [attendantName, setAttendantName] = useState('Coordenação');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load existing settings
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['attendantName'], (result) => {
        if (result.attendantName) {
          setAttendantName(result.attendantName);
        }
      });
    } else {
      const localName = localStorage.getItem('attendantName');
      if (localName) {
        setAttendantName(localName);
      }
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const nameToSave = attendantName.trim() || 'Coordenação';

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ attendantName: nameToSave }, () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      });
    } else {
      localStorage.setItem('attendantName', nameToSave);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="container">
      <header>
        <div className="logo-container">
          <MessageSquare size={28} />
        </div>
        <h1>La Home Zap</h1>
        <p>Configurações da Extensão</p>
      </header>

      <form onSubmit={handleSave}>
        <div className="form-group">
          <label htmlFor="attendant-name">Nome do Atendente</label>
          <div className="input-wrapper">
            <input
              type="text"
              id="attendant-name"
              placeholder="Digite seu nome (ex: Maria)"
              value={attendantName}
              onChange={(e) => setAttendantName(e.target.value)}
              maxLength={40}
            />
          </div>
        </div>

        <button type="submit" className="btn-save">
          Salvar Configurações
        </button>
      </form>

      {saved && (
        <div className="status-message">
          <Check size={16} />
          Configurações salvas com sucesso!
        </div>
      )}

      <footer>
        <p>La Home Care &bull; WhatsApp Web Integration</p>
      </footer>
    </div>
  );
}

export default App;
