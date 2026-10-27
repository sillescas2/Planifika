import React, { useState } from 'react';
import { Task, DayOfWeek, TaskStatus } from '../types';
import { TASK_COLORS } from '../utils/colorThemes';
import { DAYS_OF_WEEK } from '../utils/dateUtils';
import { useApp } from '../context/AppContext';
import {
  Clock,
  MoreVertical,
  CheckCircle2,
  CircleDot,
  Circle,
  GripVertical,
  Trash2,
  Edit2,
  Lock,
  FileText,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  index: number;
  dragHandleProps?: Record<string, any> | null;
  isMenuOpen?: boolean;
  onToggleMenu?: () => void;
  onCloseMenu?: () => void;
  isStatusMenuOpen?: boolean;
  onToggleStatusMenu?: () => void;
  onCloseStatusMenu?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  dragHandleProps,
  isMenuOpen: controlledIsMenuOpen,
  onToggleMenu,
  onCloseMenu,
  isStatusMenuOpen: controlledIsStatusMenuOpen,
  onToggleStatusMenu,
  onCloseStatusMenu,
}) => {
  const {
    isAdmin,
    canEdit,
    updateTaskStatus,
    deleteTask,
    openEditTaskModal,
    moveTaskBetweenDays,
    showToast,
  } = useApp();

  const [localIsMenuOpen, setLocalIsMenuOpen] = useState(false);
  const [localIsStatusMenuOpen, setLocalIsStatusMenuOpen] = useState(false);

  const isMenuOpen = controlledIsMenuOpen !== undefined ? controlledIsMenuOpen : localIsMenuOpen;
  const isStatusMenuOpen = controlledIsStatusMenuOpen !== undefined ? controlledIsStatusMenuOpen : localIsStatusMenuOpen;

  const handleToggleMenu = () => {
    if (onToggleMenu) {
      onToggleMenu();
    } else {
      setLocalIsMenuOpen(!localIsMenuOpen);
    }
  };

  const handleCloseMenu = () => {
    if (onCloseMenu) {
      onCloseMenu();
    } else {
      setLocalIsMenuOpen(false);
    }
  };

  const handleToggleStatusMenu = () => {
    if (onToggleStatusMenu) {
      onToggleStatusMenu();
    } else {
      setLocalIsStatusMenuOpen(!localIsStatusMenuOpen);
    }
  };

  const handleCloseStatusMenu = () => {
    if (onCloseStatusMenu) {
      onCloseStatusMenu();
    } else {
      setLocalIsStatusMenuOpen(false);
    }
  };

  const colorConfig = TASK_COLORS[task.color] || TASK_COLORS.sky;

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) {
      showToast(
        'Acceso restringido: Sólo el Administrador del calendario puede marcar tareas como Completadas o cambiar su estado.',
        'error'
      );
      return;
    }
    handleToggleStatusMenu();
  };

  const setStatus = (status: TaskStatus) => {
    updateTaskStatus(task.id, status);
    handleCloseStatusMenu();
  };

  const handleQuickMove = (targetDay: DayOfWeek) => {
    if (!canEdit) {
      showToast('No tienes permisos para mover tareas', 'error');
      return;
    }
    moveTaskBetweenDays(task.id, targetDay, 999);
    handleCloseMenu();
  };

  const renderStatusBadge = () => {
    if (task.status === 'none') {
      return (
        <button
          type="button"
          data-popover-trigger="true"
          onClick={handleStatusClick}
          title={isAdmin ? 'Cambiar estado (Administrador)' : 'Solo el administrador puede cambiar estado'}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200/90 rounded px-1.5 py-0.5 transition-colors cursor-pointer min-w-0 max-w-full truncate"
        >
          <FileText className="w-3 h-3 text-slate-500 stroke-[2] shrink-0" />
          <span className="truncate">Sin estado</span>
          {!isAdmin && <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-0.5" />}
        </button>
      );
    }
    if (task.status === 'completed') {
      return (
        <button
          type="button"
          data-popover-trigger="true"
          onClick={handleStatusClick}
          title={isAdmin ? 'Cambiar estado (Administrador)' : 'Solo el administrador puede cambiar estado'}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200/90 rounded px-1.5 py-0.5 transition-colors cursor-pointer min-w-0 max-w-full truncate"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600 stroke-[2.5] shrink-0" />
          <span className="truncate">Completado</span>
          {!isAdmin && <Lock className="w-2.5 h-2.5 text-emerald-700/60 shrink-0 ml-0.5" />}
        </button>
      );
    }
    if (task.status === 'partial') {
      return (
        <button
          type="button"
          data-popover-trigger="true"
          onClick={handleStatusClick}
          title={isAdmin ? 'Cambiar estado (Administrador)' : 'Solo el administrador puede cambiar estado'}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-800 bg-sky-100/90 hover:bg-sky-200/90 rounded px-1.5 py-0.5 transition-colors cursor-pointer min-w-0 max-w-full truncate"
        >
          <CircleDot className="w-3 h-3 text-sky-600 stroke-[2.5] shrink-0" />
          <span className="truncate">Parcial</span>
          {!isAdmin && <Lock className="w-2.5 h-2.5 text-sky-700/60 shrink-0 ml-0.5" />}
        </button>
      );
    }
    return (
      <button
        type="button"
        data-popover-trigger="true"
        onClick={handleStatusClick}
        title={isAdmin ? 'Cambiar estado (Administrador)' : 'Solo el administrador puede cambiar estado'}
        className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 bg-slate-200/80 hover:bg-slate-300/80 rounded px-1.5 py-0.5 transition-colors cursor-pointer min-w-0 max-w-full truncate"
      >
        <Circle className="w-3 h-3 text-slate-400 stroke-[2] shrink-0" />
        <span className="truncate">Pendiente</span>
        {!isAdmin && <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-0.5" />}
      </button>
    );
  };

  return (
    <div
      className={`group relative rounded-xl border p-2.5 sm:p-3 bg-white shadow-xs hover:shadow-md transition-all duration-150 select-none min-w-0 max-w-full cursor-default ${
        task.status === 'completed'
          ? 'opacity-85 border-slate-200 bg-slate-50/50'
          : `${colorConfig.cardBorder}`
      }`}
    >
      {/* Top row: Color Accent Indicator + Status + Actions */}
      <div className="flex items-center justify-between gap-1 mb-2 w-full min-w-0">
        <div className="flex items-center gap-1.5 relative min-w-0 flex-1">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: colorConfig.dotColor }}
            title={colorConfig.label}
          />
          {renderStatusBadge()}

          {/* Admin Status Dropdown */}
          {isStatusMenuOpen && isAdmin && (
            <div
              data-popover-menu="true"
              onMouseLeave={handleCloseStatusMenu}
              className="absolute left-0 top-7 z-50 bg-white border border-slate-200 rounded-lg shadow-xl py-1 w-44 animate-in fade-in zoom-in-95 duration-100 cursor-default"
            >
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Estado (Solo Admin)
              </div>
              <button
                type="button"
                onClick={() => setStatus('none')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-slate-50 cursor-pointer ${
                  task.status === 'none' ? 'font-semibold text-slate-800 bg-slate-100' : 'text-slate-600'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Sin estado (Informativa)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('pending')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-slate-50 cursor-pointer ${
                  task.status === 'pending' ? 'font-semibold text-slate-900 bg-slate-50' : 'text-slate-600'
                }`}
              >
                <Circle className="w-3.5 h-3.5 text-slate-400" />
                <span>Pendiente</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('partial')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-slate-50 cursor-pointer ${
                  task.status === 'partial' ? 'font-semibold text-sky-700 bg-sky-50' : 'text-slate-600'
                }`}
              >
                <CircleDot className="w-3.5 h-3.5 text-sky-600" />
                <span>Completado Parcial</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('completed')}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-slate-50 cursor-pointer ${
                  task.status === 'completed' ? 'font-semibold text-emerald-700 bg-emerald-50' : 'text-slate-600'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Completado</span>
              </button>
            </div>
          )}
        </div>

        {/* Right action menu */}
        <div className="flex items-center gap-0.5 shrink-0 -mr-1">
          {canEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditTaskModal(task);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-opacity cursor-pointer"
              title="Editar tarjeta"
              aria-label="Editar tarjeta"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              data-popover-trigger="true"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleMenu();
              }}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              title="Más opciones"
              aria-label="Más opciones"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3-dots Dropdown Menu (Positioned relative to card for foolproof alignment & zero clipping) */}
      {isMenuOpen && (
        <div
          data-popover-menu="true"
          onMouseLeave={handleCloseMenu}
          className={`absolute ${
            task.day_of_week === 'lunes' ? 'left-2' : 'right-2'
          } top-9 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-44 text-xs animate-in fade-in zoom-in-95 duration-100 cursor-default`}
        >
          {canEdit ? (
            <>
              <button
                type="button"
                onClick={() => {
                  openEditTaskModal(task);
                  handleCloseMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50 text-left cursor-pointer transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Editar detalles</span>
              </button>

              <div className="border-t border-slate-100 my-1" />
              <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Mover a otro día
              </div>
              <div className="grid grid-cols-2 gap-1 px-2 py-1">
                {DAYS_OF_WEEK.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => handleQuickMove(d.key)}
                    disabled={d.key === task.day_of_week}
                    className={`px-1.5 py-1 rounded text-[11px] text-center transition-colors ${
                      d.key === task.day_of_week
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed font-medium'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-200 hover:text-slate-900 font-medium cursor-pointer'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 my-1" />
              <button
                type="button"
                onClick={() => {
                  deleteTask(task.id);
                  handleCloseMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 hover:bg-rose-50 text-left font-medium cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Eliminar tarjeta</span>
              </button>
            </>
          ) : (
            <div className="px-3 py-2 text-slate-500 italic">
              Modo espectador: solo lectura
            </div>
          )}
        </div>
      )}

      {/* Task Title */}
      <h4
        className={`text-sm font-semibold leading-snug text-slate-900 mb-1 break-words ${
          task.status === 'completed' ? 'line-through text-slate-500' : ''
        }`}
      >
        {task.title}
      </h4>

      {/* Task Description */}
      {task.description && (
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-2.5 break-words">
          {task.description}
        </p>
      )}

      {/* Footer Info: Time estimate & Drag handle */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 min-w-0">
          {task.time_estimate ? (
            <span className="flex items-center gap-1 font-mono tabular-nums truncate">
              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{task.time_estimate}</span>
            </span>
          ) : (
            <span className="text-slate-400 italic">Sin horario</span>
          )}
        </div>

        {canEdit && (
          <div
            {...(dragHandleProps || {})}
            className="flex items-center text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 transition-colors"
            title="Arrastrar para mover de día o reordenar"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </div>
  );
};
