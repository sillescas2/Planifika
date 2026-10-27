import React from 'react';
import { useApp } from '../context/AppContext';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Columns3,
  Sparkles,
  FileText,
} from 'lucide-react';

export const WeekNavigator: React.FC = () => {
  const {
    currentWeekInfo,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    tasks,
    viewMode,
    setViewMode,
    activeCalendar,
    calendars,
    setActiveCalendarId,
  } = useApp();

  // Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const partialTasks = tasks.filter((t) => t.status === 'partial').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const noteTasks = tasks.filter((t) => t.status === 'none').length;
  const actionableTasks = totalTasks - noteTasks;
  const progressPercent = actionableTasks > 0 ? Math.round((completedTasks / actionableTasks) * 100) : 0;

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        {/* Top line: Calendar switcher and Week controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Left: Active Calendar Name & Quick Switcher */}
          <div className="flex items-center gap-2">
            <select
              value={activeCalendar?.id || ''}
              onChange={(e) => setActiveCalendarId(e.target.value)}
              className="text-sm sm:text-base font-bold text-slate-900 bg-transparent border-0 py-1 pl-0 pr-6 focus:ring-0 cursor-pointer hover:text-slate-700 transition-colors"
            >
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Week Controls & Navigation */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            
            {/* View Mode Switcher (Columns vs Single Day) */}
            <div className="hidden sm:flex items-center p-0.5 bg-slate-100 rounded-lg text-xs">
              <button
                onClick={() => setViewMode('columns')}
                title="Vista de 7 columnas"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'columns' ? 'bg-white text-slate-900 shadow-xs font-medium' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Columns3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('single')}
                title="Vista enfocada de día"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'single' ? 'bg-white text-slate-900 shadow-xs font-medium' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousWeek}
                title="Semana anterior"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={goToCurrentWeek}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
              >
                Hoy
              </button>

              <button
                onClick={goToNextWeek}
                title="Semana siguiente"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* Date line & completion summary */}
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          
          <div className="flex items-center gap-2 text-slate-700">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-900">{currentWeekInfo.formattedRange}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500 font-mono tabular-nums">Semana {currentWeekInfo.weekNumber}</span>
          </div>

          {/* KPI progress */}
          <div className="flex items-center gap-3 text-slate-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-mono tabular-nums font-medium text-slate-900">{completedTasks}</span>
              <span className="hidden sm:inline">completadas</span>
            </div>

            {partialTasks > 0 && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span className="font-mono tabular-nums font-medium text-slate-900">{partialTasks}</span>
                <span className="hidden sm:inline">en progreso</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="font-mono tabular-nums font-medium text-slate-900">{pendingTasks}</span>
              <span className="hidden sm:inline">pendientes</span>
            </div>

            {noteTasks > 0 && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono tabular-nums font-medium text-slate-700">{noteTasks}</span>
                <span className="hidden sm:inline">notas</span>
              </div>
            )}

            <div className="w-16 sm:w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-mono tabular-nums text-slate-700 font-semibold">{progressPercent}%</span>
          </div>

        </div>

      </div>
    </div>
  );
};
