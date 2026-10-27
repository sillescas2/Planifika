import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getHistoricalWeeks, parseISODate, formatDateToISO } from '../utils/dateUtils';
import {
  History,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  Filter,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { TASK_COLORS } from '../utils/colorThemes';

export const HistoryView: React.FC = () => {
  const {
    allCalendarTasks,
    activeCalendar,
    selectWeek,
    setActiveTab,
    selectedWeekStart,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'partial' | 'none'>('all');

  // Generate historical weeks (8 past, current, 4 future)
  const historicalWeeks = getHistoricalWeeks(new Date(), 10, 2);

  // Group all calendar tasks by week
  const tasksByWeek = historicalWeeks.map((week) => {
    const weekTasks = allCalendarTasks.filter((t) => t.week_start_date === week.startDateStr);
    const completed = weekTasks.filter((t) => t.status === 'completed').length;
    const partial = weekTasks.filter((t) => t.status === 'partial').length;
    const pending = weekTasks.filter((t) => t.status === 'pending').length;
    const total = weekTasks.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      week,
      tasks: weekTasks,
      total,
      completed,
      partial,
      pending,
      percent,
    };
  });

  // Filter tasks for global search
  const filteredSearchTasks = allCalendarTasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-slate-800" />
          <span>Histórico de Semanas y Registro de Actividad</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Navega por semanas anteriores para revisar tareas cerradas, métricas de cumplimiento y evolución del equipo en {activeCalendar?.name}.
        </p>
      </div>

      {/* Global Task Search across history */}
      <div className="mt-6 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar tareas en el histórico por palabra clave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="completed">Solo completadas</option>
              <option value="partial">En progreso</option>
              <option value="pending">Pendientes</option>
              <option value="none">Sin estado (Notas)</option>
            </select>
          </div>
        </div>

        {searchTerm && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2">
              Resultados de búsqueda ({filteredSearchTasks.length}):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {filteredSearchTasks.map((t) => {
                const color = TASK_COLORS[t.color] || TASK_COLORS.sky;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      selectWeek(t.week_start_date);
                      setActiveTab('weekly');
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="capitalize">{t.day_of_week}</span>
                        <span className="font-mono">{t.week_start_date}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 line-clamp-1">{t.title}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/60 text-[10px]">
                      <span className="capitalize font-medium text-slate-600">
                        {t.status === 'completed'
                          ? '✓ Completada'
                          : t.status === 'partial'
                          ? '⏳ Parcial'
                          : t.status === 'none'
                          ? '📝 Nota'
                          : '○ Pendiente'}
                      </span>
                      <span className="text-slate-500 font-semibold hover:underline flex items-center gap-0.5">
                        Ir <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Historical Weeks Grid */}
      <div className="mt-8">
        <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
          Línea temporal de semanas
        </h3>

        <div className="space-y-3">
          {tasksByWeek.map(({ week, total, completed, partial, pending, percent }) => {
            const isSelected = week.startDateStr === selectedWeekStart;
            const isCurrentWeek =
              formatDateToISO(new Date()).localeCompare(week.startDateStr) >= 0 &&
              formatDateToISO(new Date()).localeCompare(formatDateToISO(week.endDate)) <= 0;

            return (
              <div
                key={week.startDateStr}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-white border-slate-900 ring-2 ring-slate-900/10 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                {/* Week details */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold font-mono text-xs text-slate-700 shrink-0">
                    S{week.weekNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {week.formattedRange}
                      </h4>
                      {isCurrentWeek && (
                        <span className="text-[10px] font-semibold text-white bg-slate-900 px-2 py-0.5 rounded-full">
                          Semana en curso
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      {week.startDateStr} al {formatDateToISO(week.endDate)}
                    </p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-mono tabular-nums text-slate-600">
                      <b>{total}</b> {total === 1 ? 'tarea' : 'tareas'}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1 text-emerald-700 font-medium font-mono tabular-nums">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {completed}
                    </span>
                    {partial > 0 && (
                      <span className="flex items-center gap-1 text-sky-700 font-medium font-mono tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-sky-600" />
                        {partial}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-xs font-mono font-bold text-slate-900">{percent}%</span>
                      <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-emerald-600 h-full rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        selectWeek(week.startDateStr);
                        setActiveTab('weekly');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap"
                    >
                      <span>Abrir Semana</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
