import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { DayOfWeek, TaskColorId, TaskStatus } from '../types';
import { DAYS_OF_WEEK } from '../utils/dateUtils';
import { COLOR_LIST } from '../utils/colorThemes';
import {
  X,
  Clock,
  Lock,
  Sparkles,
  AlertCircle,
  FileText,
  Circle,
  CircleDot,
  CheckCircle2,
  History,
} from 'lucide-react';

export const TaskModal: React.FC = () => {
  const {
    isTaskModalOpen,
    closeTaskModal,
    taskToEdit,
    taskDefaultDay,
    createTask,
    updateTask,
    isAdmin,
    allCalendarTasks,
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('lunes');
  const [color, setColor] = useState<TaskColorId>('sky');
  const [timeEstimate, setTimeEstimate] = useState('');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setDayOfWeek(taskToEdit.day_of_week);
      setColor(taskToEdit.color);
      setTimeEstimate(taskToEdit.time_estimate || '');
      setStatus(taskToEdit.status);
    } else {
      setTitle('');
      setDescription('');
      setDayOfWeek(taskDefaultDay);
      setColor('sky');
      setTimeEstimate('');
      setStatus('pending');
    }
    setErrorMsg('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  }, [taskToEdit, taskDefaultDay, isTaskModalOpen]);

  // Extract unique task patterns from historical tasks for autocomplete & recurring suggestions
  const suggestionsPool = useMemo(() => {
    const map = new Map<
      string,
      {
        title: string;
        description: string;
        color: TaskColorId;
        time_estimate: string;
        count: number;
      }
    >();

    for (const t of allCalendarTasks) {
      const trimmed = t.title.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, {
          title: trimmed,
          description: t.description || '',
          color: t.color,
          time_estimate: t.time_estimate || '',
          count: 1,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [allCalendarTasks]);

  // Filter matching suggestions as user types
  const matchingSuggestions = useMemo(() => {
    const query = title.trim().toLowerCase();
    if (!query) {
      return suggestionsPool.slice(0, 4); // Top 4 frequent tasks when empty/focused
    }
    return suggestionsPool
      .filter((s) => s.title.toLowerCase().includes(query))
      .slice(0, 5);
  }, [suggestionsPool, title]);

  const handleSelectSuggestion = (suggestion: typeof suggestionsPool[0]) => {
    setTitle(suggestion.title);
    if (!description && suggestion.description) {
      setDescription(suggestion.description);
    }
    if (suggestion.color) {
      setColor(suggestion.color);
    }
    if (!timeEstimate && suggestion.time_estimate) {
      setTimeEstimate(suggestion.time_estimate);
    }
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || matchingSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < matchingSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : matchingSuggestions.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && highlightedIndex < matchingSuggestions.length) {
      e.preventDefault();
      handleSelectSuggestion(matchingSuggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  if (!isTaskModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('El título de la tarea es obligatorio.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      if (taskToEdit) {
        // If status changed and user is not admin, prevent or let updateTask handle it
        const res = await updateTask(taskToEdit.id, {
          title: title.trim(),
          description: description.trim(),
          day_of_week: dayOfWeek,
          color,
          time_estimate: timeEstimate.trim(),
          ...(isAdmin ? { status } : {}),
        });
        if (res.success) {
          closeTaskModal();
        } else {
          setErrorMsg(res.error || 'Error al actualizar tarea');
        }
      } else {
        const ok = await createTask({
          title: title.trim(),
          description: description.trim(),
          day_of_week: dayOfWeek,
          color,
          status,
          time_estimate: timeEstimate.trim(),
        });
        if (ok) {
          closeTaskModal();
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {taskToEdit ? 'Modificar Tarea Semanal' : 'Nueva Tarea Programada'}
            </h3>
            <p className="text-xs text-slate-500">
              Asigna día, color temático y especificaciones de la tarea
            </p>
          </div>
          <button
            onClick={closeTaskModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title Input with Autocomplete & Suggestions */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Título de la tarea <span className="text-rose-500">*</span>
              </label>
              {suggestionsPool.length > 0 && !title && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Sugerencias activas</span>
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                required
                placeholder="Ej: Sprint review, Revisión de métricas..."
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setShowSuggestions(true);
                  setHighlightedIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400"
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && matchingSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 mb-1">
                    <span className="flex items-center gap-1">
                      <History className="w-3 h-3 text-slate-400" />
                      Tareas repetitivas coincidentes
                    </span>
                    <span className="font-normal text-[9px] text-slate-400">
                      ↑↓ navegar · Enter
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {matchingSuggestions.map((item, idx) => {
                      const colorConfig = COLOR_LIST.find((c) => c.id === item.color);
                      const isHighlighted = idx === highlightedIndex;

                      return (
                        <button
                          key={item.title}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectSuggestion(item);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                            isHighlighted
                              ? 'bg-slate-100 text-slate-900 font-medium'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: colorConfig?.dotColor || '#94a3b8' }}
                            />
                            <span className="font-medium truncate">{item.title}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 shrink-0 font-mono">
                            {item.time_estimate && (
                              <span className="flex items-center gap-0.5 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                <Clock className="w-2.5 h-2.5" />
                                {item.time_estimate}
                              </span>
                            )}
                            {item.count > 1 && (
                              <span className="text-[10px] font-sans text-slate-400">
                                {item.count}x
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción o detalles
            </label>
            <textarea
              rows={3}
              placeholder="Notas, enlaces, entregables o checklist de la tarea..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Row: Day of Week & Time Estimate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Día asignado
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tiempo estimado / Horario
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ej: 2h, 10:00 - 11:30"
                  value={timeEstimate}
                  onChange={(e) => setTimeEstimate(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400"
                />
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Color Palette Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Color temático de la tarjeta
            </label>
            <div className="grid grid-cols-7 gap-2">
              {COLOR_LIST.map((c) => {
                const isSelected = color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    title={c.label}
                    className={`h-9 rounded-xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'ring-2 ring-slate-900 ring-offset-2 scale-105'
                        : 'hover:scale-102 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.dotColor }}
                  >
                    {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Selection: Sin estado, Pendiente, Parcial, Completado */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Estado de la tarea
              </label>
              {!isAdmin && taskToEdit && (
                <div className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <Lock className="w-3 h-3 text-amber-600" />
                  <span>Solo el Administrador puede modificar el estado</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Sin estado / Nota informativa */}
              <button
                type="button"
                disabled={!isAdmin && !!taskToEdit}
                onClick={() => setStatus('none')}
                className={`py-2 px-2 text-xs font-medium rounded-xl border transition-all text-center flex items-center justify-center gap-1.5 ${
                  status === 'none'
                    ? 'bg-slate-800 text-white border-slate-800 shadow-xs font-semibold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                } ${!isAdmin && !!taskToEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Sin estado</span>
              </button>

              {/* Pendiente */}
              <button
                type="button"
                disabled={!isAdmin && !!taskToEdit}
                onClick={() => setStatus('pending')}
                className={`py-2 px-2 text-xs font-medium rounded-xl border transition-all text-center flex items-center justify-center gap-1.5 ${
                  status === 'pending'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-semibold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                } ${!isAdmin && !!taskToEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <Circle className="w-3.5 h-3.5" />
                <span>Pendiente</span>
              </button>

              {/* Parcial */}
              <button
                type="button"
                disabled={!isAdmin && !!taskToEdit}
                onClick={() => setStatus('partial')}
                className={`py-2 px-2 text-xs font-medium rounded-xl border transition-all text-center flex items-center justify-center gap-1.5 ${
                  status === 'partial'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs font-semibold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                } ${!isAdmin && !!taskToEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <CircleDot className="w-3.5 h-3.5" />
                <span>Parcial</span>
              </button>

              {/* Completado */}
              <button
                type="button"
                disabled={!isAdmin && !!taskToEdit}
                onClick={() => setStatus('completed')}
                className={`py-2 px-2 text-xs font-medium rounded-xl border transition-all text-center flex items-center justify-center gap-1.5 ${
                  status === 'completed'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-semibold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                } ${!isAdmin && !!taskToEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completado</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              "Sin estado" es ideal para anotaciones, avisos o notas informativas que no requieren seguimiento de completitud.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closeTaskModal}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs active:scale-95 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : taskToEdit ? 'Guardar Cambios' : 'Crear Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
