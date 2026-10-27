import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FolderKanban,
  Plus,
  Shield,
  Edit3,
  Eye,
  Trash2,
  Calendar as CalendarIcon,
  CheckCircle2,
  Users,
} from 'lucide-react';

export const CalendarManagerView: React.FC = () => {
  const {
    calendars,
    activeCalendar,
    setActiveCalendarId,
    createCalendar,
    deleteCalendar,
    allCalendarTasks,
    currentUser,
    isAdminUser,
    openPermissionsModal,
    setActiveTab,
  } = useApp();

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState<'blue' | 'emerald' | 'indigo' | 'violet' | 'amber'>('blue');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createCalendar(name.trim(), description.trim(), theme);
      setName('');
      setDescription('');
      setIsCreating(false);
      setActiveTab('weekly');
    } catch (err) {
      console.error('Error al crear calendario:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, calName: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el calendario "${calName}"? Se borrarán todas sus tareas y permisos.`)) {
      await deleteCalendar(id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-slate-800" />
            <span>Gestión de Calendarios y Espacios de Trabajo</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isAdminUser
              ? 'Crea nuevos tableros semanales o gestiona los miembros y permisos de los existentes.'
              : 'Accede a los tableros semanales donde has sido invitado como editor o espectador.'}
          </p>
        </div>

        {isAdminUser ? (
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-xs active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{isCreating ? 'Cancelar' : 'Crear Nuevo Calendario'}</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-xl">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Solo administradores pueden crear calendarios</span>
          </div>
        )}
      </div>

      {/* Empty State when no calendars */}
      {calendars.length === 0 && !isCreating && (
        <div className="mt-8 p-8 max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 mx-auto flex items-center justify-center mb-4">
            <FolderKanban className="w-6 h-6 text-slate-500" />
          </div>
          {isAdminUser ? (
            <>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                No tienes ningún calendario todavía
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-6">
                Como usuario administrador del sistema, puedes crear el primer calendario del equipo para comenzar a organizar tareas semanales y asignar colaboradores.
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Crear tu primer calendario</span>
              </button>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                No tienes calendarios asignados
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-2">
                Tu cuenta está activa, pero aún no has sido añadido a ningún calendario de equipo.
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Un usuario con rol Administrador debe agregarte a un calendario existente para que puedas visualizar y gestionar las tareas semanales.
              </p>
            </>
          )}
        </div>
      )}

      {/* Creation form */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="mt-6 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 animate-in fade-in duration-150"
        >
          <h3 className="text-sm font-bold text-slate-900">Configuración del nuevo calendario</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre del Calendario <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Planificación Operaciones Logísticas"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tema de color
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="blue">Azul Océano</option>
                <option value="emerald">Verde Esmeralda</option>
                <option value="indigo">Índigo Estratégico</option>
                <option value="violet">Púrpura Creativo</option>
                <option value="amber">Ámbar Intenso</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción o propósito del equipo
            </label>
            <textarea
              rows={2}
              placeholder="Describe el objetivo y miembros de este calendario semanal..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creando...' : 'Crear y convertirte en Administrador'}
            </button>
          </div>
        </form>
      )}

      {/* Calendars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
        {calendars.map((cal) => {
          const isActive = cal.id === activeCalendar?.id;
          const isOwner = cal.owner_id === currentUser?.id;
          const role = isOwner ? 'admin' : (cal.role || 'viewer');
          const tasksCount = allCalendarTasks.filter((t) => t.calendar_id === cal.id).length;

          return (
            <div
              key={cal.id}
              className={`rounded-2xl border p-5 bg-white transition-all flex flex-col justify-between ${
                isActive
                  ? 'ring-2 ring-slate-900 border-transparent shadow-md'
                  : 'border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  {role === 'admin' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5">
                      <Shield className="w-3 h-3 text-amber-600" />
                      <span>Administrador</span>
                    </span>
                  ) : role === 'editor' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-md px-2 py-0.5">
                      <Edit3 className="w-3 h-3 text-sky-600" />
                      <span>Editor</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5">
                      <Eye className="w-3 h-3 text-slate-400" />
                      <span>Espectador</span>
                    </span>
                  )}

                  {isActive && (
                    <span className="text-[11px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                      Activo
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1 leading-snug">
                  {cal.name}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                  {cal.description || 'Sin descripción adicional.'}
                </p>

                <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1 font-mono tabular-nums">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tasksCount} tareas totales</span>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setActiveCalendarId(cal.id);
                    setActiveTab('weekly');
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isActive ? 'Abrir Planificador' : 'Seleccionar'}
                </button>

                <div className="flex items-center gap-1">
                  {role === 'admin' && (
                    <>
                      <button
                        onClick={() => {
                          setActiveCalendarId(cal.id);
                          openPermissionsModal();
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Gestionar miembros y permisos"
                      >
                        <Users className="w-4 h-4" />
                      </button>

                      {calendars.length > 1 && (
                        <button
                          onClick={() => handleDelete(cal.id, cal.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar calendario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
