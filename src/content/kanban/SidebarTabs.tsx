import { useState, useEffect } from 'react';
import { Columns3, Zap, ArrowRightLeft, ChevronRight, UserCircle } from 'lucide-react';
import KanbanPanel from './KanbanPanel';
import QuickReplies from './QuickReplies';
import TransferTab from './TransferTab';
import AttendantManager from './AttendantManager';
import { SELECTORS } from '../../utils/selectors';

type TabType = 'attendants' | 'kanban' | 'replies' | 'transfer' | null;

function SidebarTabs() {
  const [activeTab, setActiveTab] = useState<TabType>(null);

  // Resize the WhatsApp Web layout dynamically when panels slide in/out
  useEffect(() => {
    const hostElement = document.getElementById('la-home-zap-root');
    const appElement = document.querySelector(SELECTORS.appRoot) as HTMLElement;

    // Navbar is always visible (52px wide). Open drawer adds 350px (total 402px).
    const width = activeTab ? '402px' : '52px';

    if (hostElement) {
      hostElement.style.width = width;
      hostElement.style.transition = 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    }

    if (appElement) {
      appElement.style.width = `calc(100% - ${width})`;
      appElement.style.transition = 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    }

    return () => {
      if (hostElement) {
        hostElement.style.width = '0px';
      }
      if (appElement) {
        appElement.style.width = '100%';
      }
    };
  }, [activeTab]);

  const handleTabClick = (tab: TabType) => {
    setActiveTab(prev => (prev === tab ? null : tab));
  };

  return (
    <div className="la-home-zap-sidebar-root">
      {/* Sliding Drawer Container */}
      <div className={`la-home-zap-drawer ${activeTab ? 'open' : ''}`}>
        {activeTab === 'attendants' && <AttendantManager />}
        {activeTab === 'kanban' && <KanbanPanel />}
        {activeTab === 'replies' && <QuickReplies />}
        {activeTab === 'transfer' && <TransferTab />}
      </div>

      {/* Control vertical navigation bar */}
      <div className="la-home-zap-navbar">
        <button
          type="button"
          className={`la-home-zap-nav-btn ${activeTab === 'attendants' ? 'active' : ''}`}
          onClick={() => handleTabClick('attendants')}
          data-tooltip="Nome Personalizado"
        >
          <UserCircle size={20} />
        </button>

        <button
          type="button"
          className={`la-home-zap-nav-btn ${activeTab === 'kanban' ? 'active' : ''}`}
          onClick={() => handleTabClick('kanban')}
          data-tooltip="Quadro Kanban"
        >
          <Columns3 size={20} />
        </button>

        <button
          type="button"
          className={`la-home-zap-nav-btn ${activeTab === 'replies' ? 'active' : ''}`}
          onClick={() => handleTabClick('replies')}
          data-tooltip="Respostas Rápidas"
        >
          <Zap size={20} />
        </button>

        <button
          type="button"
          className={`la-home-zap-nav-btn ${activeTab === 'transfer' ? 'active' : ''}`}
          onClick={() => handleTabClick('transfer')}
          data-tooltip="Transferir Conversa"
        >
          <ArrowRightLeft size={20} />
        </button>

        {activeTab !== null && (
          <button
            type="button"
            className="la-home-zap-nav-btn"
            style={{ marginTop: 'auto', color: '#64748b' }}
            onClick={() => setActiveTab(null)}
            data-tooltip="Recolher Painel"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

export default SidebarTabs;
