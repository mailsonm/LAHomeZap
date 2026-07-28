import { useState, useEffect } from 'react';
import { Columns3, Zap, ArrowRightLeft, ChevronRight, ChevronLeft, UserCircle } from 'lucide-react';
import KanbanPanel from './KanbanPanel';
import QuickReplies from './QuickReplies';
import TransferTab from './TransferTab';
import AttendantManager from './AttendantManager';
import { SELECTORS } from '../../utils/selectors';

type TabType = 'attendants' | 'kanban' | 'replies' | 'transfer' | null;

function SidebarTabs() {
  const [activeTab, setActiveTab] = useState<TabType>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Resize the WhatsApp Web layout dynamically when panels slide in/out or dock collapses
  useEffect(() => {
    const hostElement = document.getElementById('la-home-zap-root');
    const appElement = document.querySelector(SELECTORS.appRoot) as HTMLElement;

    // Calculate host width: open panel = 402px, collapsed dock = 32px, normal dock = 52px
    let hostWidth = '52px';
    if (activeTab) {
      hostWidth = '402px';
    } else if (isCollapsed) {
      hostWidth = '32px';
    }

    if (hostElement) {
      hostElement.style.width = hostWidth;
      hostElement.style.transition = 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    }

    // Keep WhatsApp Web at 100% width unless a drawer panel is open
    if (appElement) {
      appElement.style.width = activeTab ? 'calc(100% - 402px)' : '100%';
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
  }, [activeTab, isCollapsed]);

  const handleTabClick = (tab: TabType) => {
    if (isCollapsed) {
      setIsCollapsed(false);
    }
    setActiveTab(prev => (prev === tab ? null : tab));
  };

  const toggleDockCollapse = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
    } else {
      setActiveTab(null);
      setIsCollapsed(true);
    }
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

      {/* Control vertical navigation bar / dock */}
      <div className={`la-home-zap-navbar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Toggle Collapse/Expand Button (>) / (<) */}
        <button
          type="button"
          className="la-home-zap-nav-btn toggle-dock-btn"
          onClick={toggleDockCollapse}
          data-tooltip={isCollapsed ? 'Expandir Dock (<)' : 'Ocultar Dock (>)'}
          style={{ marginBottom: isCollapsed ? 0 : '8px', color: '#38bdf8' }}
        >
          {isCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        {!isCollapsed && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

export default SidebarTabs;
