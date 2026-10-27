import React, { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { useApp } from '../context/AppContext';
import { DAYS_OF_WEEK, getDateForDayOfWeek } from '../utils/dateUtils';
import { DayOfWeek, Task } from '../types';
import { TaskCard } from './TaskCard';
import { Plus, Calendar as CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

export const WeeklyBoard: React.FC = () => {
  const {
    tasks,
    selectedWeekStart,
    canEdit,
    isAdmin,
    openCreateTaskModal,
    moveTaskBetweenDays,
    reorderTasksInDay,
    mobileActiveDay,
    setMobileActiveDay,
    viewMode,
    showToast,
  } = useApp();

  // Centralized active menu states so only ONE menu across all cards can be open at a time
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);
  const [activeStatusTaskId, setActiveStatusTaskId] = useState<string | null>(null);

  // Close menus on outside click or tap
  useEffect(() => {
    if (!activeMenuTaskId && !activeStatusTaskId) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Allow clicks inside the active menu or on trigger buttons
      if (
        target.closest('[data-popover-menu="true"]') ||
        target.closest('[data-popover-trigger="true"]')
      ) {
        return;
      }

      setActiveMenuTaskId(null);
      setActiveStatusTaskId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activeMenuTaskId, activeStatusTaskId]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (!canEdit) {
      showToast('Permiso denegado: Necesitas rol de Editor o Administrador para mover tarjetas.', 'error');
      return;
    }

    const sourceDay = source.droppableId.replace('day-', '') as DayOfWeek;
    const destDay = destination.droppableId.replace('day-', '') as DayOfWeek;

    if (sourceDay === destDay) {
      reorderTasksInDay(sourceDay, source.index, destination.index);
    } else {
      moveTaskBetweenDays(draggableId, destDay, destination.index);
    }
  };

  // Group tasks by day
  const tasksByDay = DAYS_OF_WEEK.reduce<Record<DayOfWeek, Task[]>>((acc, d) => {
    acc[d.key] = tasks
      .filter((t) => t.day_of_week === d.key)
      .sort((a, b) => a.position - b.position);
    return acc;
  }, {
    lunes: [],
    martes: [],
    miercoles: [],
    jueves: [],
    viernes: [],
    sabado: [],
    domingo: [],
  });

  return (
    <div className="w-full">
      {/* MOBILE DAY TABS (Ergonomic Thumb Carousel on Mobile) */}
      <div className="md:hidden sticky top-16 z-20 bg-slate-100 border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {DAYS_OF_WEEK.map((day) => {
            const dayDate = getDateForDayOfWeek(selectedWeekStart, day.key);
            const count = tasksByDay[day.key].length;
            const completedCount = tasksByDay[day.key].filter((t) => t.status === 'completed').length;
            const isActive = mobileActiveDay === day.key;

            return (
              <button
                key={day.key}
                onClick={() => setMobileActiveDay(day.key)}
                className={`flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200/60'
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-tight">
                  {day.shortLabel}
                </span>
                <span className="text-sm font-extrabold font-mono tabular-nums leading-tight">
                  {dayDate.getDate()}
                </span>
                <div className="flex items-center gap-0.5 mt-0.5 text-[9px]">
                  <span className={`font-mono ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                    {count}
                  </span>
                  {completedCount > 0 && (
                    <span className={isActive ? 'text-emerald-300' : 'text-emerald-600'}>
                      ✓{completedCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* DRAG AND DROP BOARD */}
      <DragDropContext onDragEnd={handleDragEnd}>
        {/* DESKTOP 7 COLUMNS OR SINGLE DAY VIEW */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className={viewMode === 'columns' ? 'overflow-x-auto no-scrollbar pb-2' : ''}>
            <div
              className={`grid gap-3 lg:gap-3.5 ${
                viewMode === 'single'
                  ? 'grid-cols-1 max-w-xl mx-auto'
                  : 'grid-cols-1 md:grid-cols-7 md:min-w-[960px]'
              }`}
            >
              {DAYS_OF_WEEK.map((day, dayIdx) => {
                const isSelectedDay = day.key === mobileActiveDay;
                const dayDate = getDateForDayOfWeek(selectedWeekStart, day.key);
                const dayTasks = tasksByDay[day.key];
                const isToday =
                  new Date().toDateString() === dayDate.toDateString();

                // On mobile (< md): ALWAYS show only the active day selected by the user in the tabs
                // On desktop (>= md): if viewMode is 'columns', show all 7 columns (md:flex); if 'single', show only active day
                const visibilityClass = isSelectedDay
                  ? 'flex'
                  : viewMode === 'columns'
                  ? 'hidden md:flex'
                  : 'hidden';

                const prevDay = dayIdx > 0 ? DAYS_OF_WEEK[dayIdx - 1] : null;
                const nextDay = dayIdx < DAYS_OF_WEEK.length - 1 ? DAYS_OF_WEEK[dayIdx + 1] : null;

                const hasActivePopoverInDay = dayTasks.some(
                  (t) => t.id === activeMenuTaskId || t.id === activeStatusTaskId
                );

                return (
                  <div
                    key={day.key}
                    className={`flex flex-col rounded-2xl bg-slate-100/70 border border-slate-200/80 p-2.5 sm:p-3 min-h-[500px] min-w-0 transition-all ${visibilityClass} ${
                      isToday ? 'ring-2 ring-slate-900/10 bg-slate-100/90' : ''
                    } ${hasActivePopoverInDay ? 'relative z-30' : 'relative z-0'}`}
                  >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      {prevDay && (
                        <button
                          type="button"
                          onClick={() => setMobileActiveDay(prevDay.key)}
                          className="md:hidden p-1 text-slate-500 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                          title={`Día anterior: ${prevDay.label}`}
                          aria-label={`Día anterior: ${prevDay.label}`}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 capitalize">
                            {day.label}
                          </span>
                          {isToday && (
                            <span className="text-[10px] bg-slate-900 text-white font-semibold rounded px-1.5 py-0.2">
                              Hoy
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                          {dayDate.getDate()} {dayDate.toLocaleDateString('es-ES', { month: 'short' })}
                        </div>
                      </div>
                      {nextDay && (
                        <button
                          type="button"
                          onClick={() => setMobileActiveDay(nextDay.key)}
                          className="md:hidden p-1 text-slate-500 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                          title={`Día siguiente: ${nextDay.label}`}
                          aria-label={`Día siguiente: ${nextDay.label}`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 font-mono tabular-nums">
                        {dayTasks.length}
                      </span>

                      {canEdit && (
                        <button
                          onClick={() => openCreateTaskModal(day.key)}
                          title={`Añadir tarea para el ${day.label}`}
                          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={`day-${day.key}`}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 flex flex-col gap-2.5 transition-colors rounded-xl p-1 ${
                          snapshot.isDraggingOver
                            ? 'bg-slate-200/60 ring-2 ring-dashed ring-slate-400'
                            : ''
                        }`}
                      >
                        {dayTasks.map((task, index) => {
                          const hasActivePopover =
                            task.id === activeMenuTaskId ||
                            task.id === activeStatusTaskId;

                          return (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                              isDragDisabled={!canEdit}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={`transform transition-shadow ${
                                    dragSnapshot.isDragging
                                      ? 'shadow-xl rotate-1 z-50'
                                      : hasActivePopover
                                      ? 'relative z-40'
                                      : 'relative z-0'
                                  }`}
                                >
                                  <TaskCard
                                    task={task}
                                    index={index}
                                    dragHandleProps={dragProvided.dragHandleProps}
                                    isMenuOpen={activeMenuTaskId === task.id}
                                    onToggleMenu={() => {
                                      setActiveStatusTaskId(null);
                                      setActiveMenuTaskId((prev) =>
                                        prev === task.id ? null : task.id
                                      );
                                    }}
                                    onCloseMenu={() => {
                                      setActiveMenuTaskId((prev) =>
                                        prev === task.id ? null : prev
                                      );
                                    }}
                                    isStatusMenuOpen={activeStatusTaskId === task.id}
                                    onToggleStatusMenu={() => {
                                      setActiveMenuTaskId(null);
                                      setActiveStatusTaskId((prev) =>
                                        prev === task.id ? null : task.id
                                      );
                                    }}
                                    onCloseStatusMenu={() => {
                                      setActiveStatusTaskId((prev) =>
                                        prev === task.id ? null : prev
                                      );
                                    }}
                                  />
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}

                        {/* Empty day placeholder */}
                        {dayTasks.length === 0 && (
                          <div className="flex-1 min-h-[140px] flex flex-col items-center justify-center p-4 border border-dashed border-slate-300/80 rounded-xl text-center">
                            <p className="text-xs text-slate-400 mb-2">Sin tareas programadas</p>
                            {canEdit && (
                              <button
                                onClick={() => openCreateTaskModal(day.key)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-950 py-1 px-2 rounded-lg hover:bg-white transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Añadir</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>

                  {/* Column bottom quick add */}
                  {canEdit && dayTasks.length > 0 && (
                    <button
                      onClick={() => openCreateTaskModal(day.key)}
                      className="mt-2 w-full py-1.5 flex items-center justify-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white/80 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir tarjeta</span>
                    </button>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};
