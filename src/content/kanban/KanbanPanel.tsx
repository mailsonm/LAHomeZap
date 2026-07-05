import { useState } from 'react';
import { Plus, ArrowLeft, ArrowRight, Trash2, Calendar } from 'lucide-react';
import type { KanbanCard } from '../../types';

function KanbanPanel() {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Load cards from storage on mount
  useState(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['kanbanCards'], (result) => {
        if (result.kanbanCards && Array.isArray(result.kanbanCards)) {
          setCards(result.kanbanCards);
        }
      });
    } else {
      const localCards = localStorage.getItem('kanbanCards');
      if (localCards) {
        try { setCards(JSON.parse(localCards)); } catch (e) { console.warn('[La Home Zap] Failed to parse local cards:', e); }
      }
    }
  });

  const persistCards = (updatedList: KanbanCard[]) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ kanbanCards: updatedList });
    } else {
      localStorage.setItem('kanbanCards', JSON.stringify(updatedList));
    }
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    const newCard: KanbanCard = {
      id: Date.now().toString(),
      title,
      description: newDesc.trim(),
      status: 'new',
      createdAt: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    };

    const updatedList = [newCard, ...cards];
    setCards(updatedList);
    setNewTitle('');
    setNewDesc('');
    setIsAdding(false);
    persistCards(updatedList);
  };

  const handleDeleteCard = (id: string) => {
    const updatedList = cards.filter(c => c.id !== id);
    setCards(updatedList);
    persistCards(updatedList);
  };

  const handleMoveCard = (id: string, direction: 'left' | 'right') => {
    const statusOrder: KanbanCard['status'][] = ['new', 'progress', 'done'];
    const updatedList = cards.map(c => {
      if (c.id === id) {
        const currentIndex = statusOrder.indexOf(c.status);
        let nextIndex = currentIndex;
        if (direction === 'left' && currentIndex > 0) nextIndex = currentIndex - 1;
        else if (direction === 'right' && currentIndex < statusOrder.length - 1) nextIndex = currentIndex + 1;
        return { ...c, status: statusOrder[nextIndex] };
      }
      return c;
    });
    setCards(updatedList);
    persistCards(updatedList);
  };

  const renderCardsForStatus = (status: KanbanCard['status']) => {
    const filtered = cards.filter(c => c.status === status);
    if (filtered.length === 0) {
      return (
        <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.15)', border: '1px dashed rgba(255,255,255,0.03)', borderRadius: '8px' }}>
          Vazio
        </div>
      );
    }

    return filtered.map(card => (
      <div key={card.id} className="kanban-card">
        <div className="card-title">{card.title}</div>
        {card.description && <div className="card-desc">{card.description}</div>}

        <div className="card-meta">
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Calendar size={10} />
            {card.createdAt}
          </div>

          <div className="card-actions">
            {card.status !== 'new' && (
              <button type="button" className="btn-card-action" onClick={() => handleMoveCard(card.id, 'left')} title="Mover para esquerda">
                <ArrowLeft size={11} />
              </button>
            )}

            <button type="button" className="btn-card-action btn-card-delete" onClick={() => handleDeleteCard(card.id)} title="Excluir Demanda">
              <Trash2 size={11} />
            </button>

            {card.status !== 'done' && (
              <button type="button" className="btn-card-action" onClick={() => handleMoveCard(card.id, 'right')} title="Mover para direita">
                <ArrowRight size={11} />
              </button>
            )}
          </div>
        </div>
      </div>
    ));
  };

  const getCountForStatus = (status: KanbanCard['status']) => {
    return cards.filter(c => c.status === status).length;
  };

  return (
    <div className="kanban-root-container" style={{ width: '100%', height: '100%', borderLeft: 'none' }}>
      <div className="kanban-body">
        <div className="kanban-header">
          <h1>Painel Kanban</h1>
          <button type="button" className="btn-add-card" onClick={() => setIsAdding(!isAdding)}>
            <Plus size={14} /> Nova
          </button>
        </div>

        {isAdding && (
          <form onSubmit={handleAddCard} className="quick-add-form">
            <input type="text" placeholder="Título da demanda..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={40} required />
            <textarea placeholder="Detalhes/Descrição..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} maxLength={150} />
            <div className="form-actions">
              <button type="submit" className="btn-form-action btn-form-confirm">Criar</button>
              <button type="button" className="btn-form-action btn-form-cancel" onClick={() => { setIsAdding(false); setNewTitle(''); setNewDesc(''); }}>Cancelar</button>
            </div>
          </form>
        )}

        <div className="kanban-columns-container">
          <div className="kanban-column">
            <div className="column-header">
              <span className="column-title novas">Novas</span>
              <span className="column-badge">{getCountForStatus('new')}</span>
            </div>
            <div className="cards-list">{renderCardsForStatus('new')}</div>
          </div>

          <div className="kanban-column">
            <div className="column-header">
              <span className="column-title andamento">Em Andamento</span>
              <span className="column-badge">{getCountForStatus('progress')}</span>
            </div>
            <div className="cards-list">{renderCardsForStatus('progress')}</div>
          </div>

          <div className="kanban-column">
            <div className="column-header">
              <span className="column-title concluidas">Concluídas</span>
              <span className="column-badge">{getCountForStatus('done')}</span>
            </div>
            <div className="cards-list">{renderCardsForStatus('done')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KanbanPanel;
