import React from 'react';
import { useApp } from '../context/AppContext';
import { CalendarDays, History, FolderKanban, Settings, Plus } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, canEdit, isAdminUser, openCreateTaskModal, mobileActiveDay } = useApp();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe">
      <div className={`grid ${isAdminUser ? 'grid-cols-5' : 'grid-cols-4'} items-center h-16 px-2`}>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
            activeTab === 'weekly' ? 'text-slate-950 font-semibold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Semana</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
            activeTab === 'history' ? 'text-slate-950 font-semibold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Histórico</span>
        </button>

        {/* Center Primary Action: Add Task */}
        <div className="flex items-center justify-center">
          {canEdit ? (
            <button
              onClick={() => openCreateTaskModal(mobileActiveDay)}
              className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
              title="Añadir tarea"
              aria-label="Añadir tarea"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
              👁
            </div>
          )}
        </div>

        <button
          onClick={() => setActiveTab('calendars')}
          className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
            activeTab === 'calendars' ? 'text-slate-950 font-semibold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderKanban className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Tableros</span>
        </button>

        {isAdminUser && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
              activeTab === 'settings' ? 'text-slate-950 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">Ajustes</span>
          </button>
        )}
      </div>
    </nav>
  );
};
