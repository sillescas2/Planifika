import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CalendarDays,
  History,
  FolderKanban,
  Settings,
  Shield,
  Edit3,
  Eye,
  Plus,
  Users,
  Database,
  ChevronDown,
  UserCheck,
  LogOut,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    switchDemoUser,
    logout,
    allProfiles,
    activeCalendar,
    currentRole,
    isAdmin,
    isAdminUser,
    canEdit,
    activeTab,
    setActiveTab,
    openCreateTaskModal,
    openPermissionsModal,
    openCalendarModal,
    isLiveConnected,
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const roleBadge = () => {
    if (!activeCalendar) {
      if (isAdminUser) {
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/80 rounded-md px-2 py-0.5 whitespace-nowrap">
            <Shield className="w-3 h-3 text-amber-600" />
            <span>Admin Sistema</span>
          </span>
        );
      }
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 whitespace-nowrap">
          <Eye className="w-3 h-3 text-slate-500" />
          <span>Usuario</span>
        </span>
      );
    }
    if (currentRole === 'admin') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/80 rounded-md px-2 py-0.5 whitespace-nowrap">
          <Shield className="w-3 h-3 text-amber-600" />
          <span>Administrador</span>
        </span>
      );
    }
    if (currentRole === 'editor') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-sky-700 bg-sky-50 border border-sky-200/80 rounded-md px-2 py-0.5 whitespace-nowrap">
          <Edit3 className="w-3 h-3 text-sky-600" />
          <span>Editor</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 whitespace-nowrap">
        <Eye className="w-3 h-3 text-slate-500" />
        <span>Espectador</span>
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 md:gap-8 h-16">
          
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('weekly')}
              className="text-left group flex items-center gap-2 focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tighter">
                P
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight text-slate-900 group-hover:text-slate-700 transition-colors">
                  Planifika
                </span>
              </div>
            </button>

            {/* Live / Demo badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 pl-2 border-l border-slate-200">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>{isLiveConnected ? 'Supabase Live' : 'Modo Demo / RLS'}</span>
            </div>
          </div>

          {/* Zone 2: 4 clean single-line nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('weekly')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 flex items-center gap-1.5 ${
                activeTab === 'weekly'
                  ? 'text-slate-950 font-semibold border-b-2 border-slate-900'
                  : 'text-slate-600'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Semana Actual</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'text-slate-950 font-semibold border-b-2 border-slate-900'
                  : 'text-slate-600'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Histórico</span>
            </button>

            <button
              onClick={() => setActiveTab('calendars')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 flex items-center gap-1.5 ${
                activeTab === 'calendars'
                  ? 'text-slate-950 font-semibold border-b-2 border-slate-900'
                  : 'text-slate-600'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>Calendarios</span>
            </button>

            {isAdminUser && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 flex items-center gap-1.5 ${
                  activeTab === 'settings'
                    ? 'text-slate-950 font-semibold border-b-2 border-slate-900'
                    : 'text-slate-600'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Configuración</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick permissions modal button if Admin and active calendar */}
            {isAdmin && activeCalendar && (
              <button
                onClick={openPermissionsModal}
                title="Gestionar permisos del calendario"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Permisos</span>
              </button>
            )}

            {/* Primary Action: Add Task (if canEdit) */}
            {canEdit ? (
              <button
                onClick={() => openCreateTaskModal('lunes')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:scale-[0.98] transition-all whitespace-nowrap shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Nueva Tarea</span>
                <span className="sm:hidden">Tarea</span>
              </button>
            ) : !activeCalendar ? (
              <span className="text-xs text-slate-400 italic px-2">Sin calendario</span>
            ) : (
              <span className="text-xs text-slate-400 italic px-2">Solo lectura</span>
            )}

            {/* Profile & Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-all text-left"
              >
                <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                  {currentUser?.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.full_name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    currentUser?.full_name?.charAt(0) || 'U'
                  )}
                </div>
                <div className="hidden lg:block text-left leading-tight pr-1">
                  <div className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">
                    {currentUser?.full_name}
                  </div>
                  <div className="text-[10px] text-slate-500">{roleBadge()}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-semibold text-slate-900">{currentUser?.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">
                        {activeCalendar ? 'Rol en este calendario:' : 'Rol en el sistema:'}
                      </span>
                      {roleBadge()}
                    </div>
                  </div>

                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Cambiar usuario demo (probar RLS)
                  </div>

                  <div className="space-y-1">
                    {allProfiles.map((profile) => {
                      const isSelected = profile.id === currentUser?.id;
                      return (
                        <button
                          key={profile.id}
                          onClick={() => {
                            switchDemoUser(profile.id);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left ${
                            isSelected
                              ? 'bg-slate-100 font-medium text-slate-950'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                              {profile.full_name.charAt(0)}
                            </div>
                            <div className="truncate">
                              <p className="truncate text-xs">{profile.full_name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{profile.email}</p>
                            </div>
                          </div>
                          {isSelected && <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setActiveTab('calendars');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-lg text-left transition-colors cursor-pointer"
                    >
                      <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                      <span>Gestionar mis calendarios</span>
                    </button>
                    {isAdminUser && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setActiveTab('settings');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-lg text-left transition-colors cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-400" />
                        <span>Configuración y Supabase</span>
                      </button>
                    )}
                    <div className="border-t border-slate-100 my-1 pt-1" />
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg text-left font-medium transition-colors cursor-pointer"
                      title="Cerrar sesión y cambiar de usuario"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Salir (Cerrar sesión)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
