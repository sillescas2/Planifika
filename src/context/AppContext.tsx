import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  CalendarPermission,
  DayOfWeek,
  Task,
  TaskColorId,
  TaskStatus,
  UserProfile,
  UserRole,
  WeekInfo,
} from '../types';
import {
  formatDateToISO,
  getMondayOfDate,
  getWeekInfo,
  parseISODate,
} from '../utils/dateUtils';
import { DEMO_PROFILES, LEGACY_USER_ID_MAP, isDemoAccount, planifikaService } from '../lib/supabase';

interface ToastData {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  switchDemoUser: (userId: string) => void;
  logout: () => Promise<void>;
  allProfiles: UserProfile[];
  loadProfiles: () => Promise<void>;
  addNewProfile: (profile: UserProfile) => Promise<void>;
  createUserWithPassword: (
    email: string,
    password: string,
    fullName: string,
    role: 'admin' | 'user'
  ) => Promise<{ success: boolean; error?: string }>;
  updateUserAccount: (
    userId: string,
    data: { full_name?: string; email?: string; password?: string; role?: 'admin' | 'user' }
  ) => Promise<{ success: boolean; error?: string }>;
  deleteUserAccount: (userId: string) => Promise<{ success: boolean; error?: string }>;
  
  calendars: Calendar[];
  activeCalendar: Calendar | null;
  setActiveCalendarId: (id: string) => void;
  currentRole: UserRole;
  isAdmin: boolean;
  isAdminUser: boolean;
  canEdit: boolean;
  
  currentWeekInfo: WeekInfo;
  selectedWeekStart: string;
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
  goToCurrentWeek: () => void;
  selectWeek: (isoDateStr: string) => void;

  tasks: Task[];
  allCalendarTasks: Task[];
  loadingTasks: boolean;
  
  mobileActiveDay: DayOfWeek;
  setMobileActiveDay: (day: DayOfWeek) => void;
  viewMode: 'columns' | 'single';
  setViewMode: (mode: 'columns' | 'single') => void;

  // Task operations
  createTask: (data: {
    title: string;
    description: string;
    color: TaskColorId;
    day_of_week: DayOfWeek | DayOfWeek[];
    status?: TaskStatus;
    time_estimate?: string;
  }) => Promise<boolean>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<{ success: boolean; error?: string }>;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<{ success: boolean; error?: string }>;
  deleteTask: (taskId: string) => Promise<boolean>;
  moveTaskBetweenDays: (
    taskId: string,
    targetDay: DayOfWeek,
    targetIndex: number
  ) => Promise<boolean>;
  reorderTasksInDay: (day: DayOfWeek, sourceIndex: number, destinationIndex: number) => Promise<boolean>;

  // Calendar operations
  createCalendar: (
    name: string,
    description: string,
    colorTheme: 'blue' | 'emerald' | 'indigo' | 'violet' | 'amber'
  ) => Promise<Calendar>;
  updateCalendar: (id: string, updates: Partial<Calendar>) => Promise<void>;
  deleteCalendar: (id: string) => Promise<void>;
  
  // Permissions
  permissions: CalendarPermission[];
  loadPermissions: () => Promise<void>;
  grantPermission: (userId: string, role: UserRole) => Promise<void>;
  revokePermission: (userId: string, permId?: string) => Promise<void>;

  // UI state & Modals
  activeTab: 'weekly' | 'history' | 'calendars' | 'settings';
  setActiveTab: (tab: 'weekly' | 'history' | 'calendars' | 'settings') => void;
  
  isTaskModalOpen: boolean;
  taskToEdit: Task | null;
  taskDefaultDay: DayOfWeek;
  openCreateTaskModal: (defaultDay?: DayOfWeek) => void;
  openEditTaskModal: (task: Task) => void;
  closeTaskModal: () => void;
  
  isPermissionsModalOpen: boolean;
  openPermissionsModal: () => void;
  closePermissionsModal: () => void;

  isCalendarModalOpen: boolean;
  openCalendarModal: () => void;
  closeCalendarModal: () => void;

  isSettingsModalOpen: boolean;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;

  // Toast
  toast: ToastData | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;

  // Connection & Sync
  isLiveConnected: boolean;
  supabaseCredentials: { url: string; anonKey: string };
  saveSupabaseCredentials: (url: string, key: string) => Promise<{ success: boolean; message: string }>;
  resetDemoData: () => void;
  refreshAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. User State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('planifika_active_user_id');
    if (saved === 'logged_out' || saved === '') {
      return null;
    }
    const resolvedSaved = (saved && LEGACY_USER_ID_MAP[saved]) ? LEGACY_USER_ID_MAP[saved] : (saved || '');

    let pool: UserProfile[] = [...DEMO_PROFILES];
    try {
      const rawStore = localStorage.getItem('planifika_local_store');
      if (rawStore) {
        const parsed = JSON.parse(rawStore);
        if (parsed.profiles) {
          pool = [...parsed.profiles, ...DEMO_PROFILES];
        }
      }
    } catch (e) {}

    const matched = pool.find(
      (p) => p.id === resolvedSaved || (saved && (p.id === saved || p.email.toLowerCase() === saved.toLowerCase()))
    );
    return matched || DEMO_PROFILES[0];
  });
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>(DEMO_PROFILES);

  // 2. Calendar State
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [activeCalendarId, setActiveCalendarId] = useState<string>('');
  const [permissions, setPermissions] = useState<CalendarPermission[]>([]);

  // 3. Navigation / Week State
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() =>
    formatDateToISO(getMondayOfDate(new Date()))
  );
  const [mobileActiveDay, setMobileActiveDay] = useState<DayOfWeek>(() => {
    const dayIndex = new Date().getDay();
    const map: Record<number, DayOfWeek> = {
      0: 'domingo',
      1: 'lunes',
      2: 'martes',
      3: 'miercoles',
      4: 'jueves',
      5: 'viernes',
      6: 'sabado',
    };
    return map[dayIndex] || 'lunes';
  });
  const [viewMode, setViewMode] = useState<'columns' | 'single'>('columns');
  const [activeTab, setActiveTab] = useState<'weekly' | 'history' | 'calendars' | 'settings'>('weekly');

  // 4. Tasks State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allCalendarTasks, setAllCalendarTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);

  // 5. Modals State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskDefaultDay, setTaskDefaultDay] = useState<DayOfWeek>('lunes');
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // 6. Toast Notification
  const [toast, setToast] = useState<ToastData | null>(null);

  // 7. Supabase Credentials
  const [isLiveConnected, setIsLiveConnected] = useState(planifikaService.isConnectedToSupabase());
  const [supabaseCredentials, setSupabaseCredentials] = useState(planifikaService.getCredentials());

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4000);
  }, []);

  // Compute WeekInfo
  const currentWeekInfo = useMemo(() => {
    const d = parseISODate(selectedWeekStart);
    return getWeekInfo(d);
  }, [selectedWeekStart]);

  // Load profiles from Supabase/Local database
  const loadProfiles = useCallback(async () => {
    const profiles = await planifikaService.getProfiles();
    setAllProfiles(profiles);
  }, []);

  // Full manual refresh from Supabase database
  const refreshAllData = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const freshProfiles = await planifikaService.getProfiles();
      setAllProfiles(freshProfiles);

      const savedId = localStorage.getItem('planifika_active_user_id');
      let activeUser = currentUser;
      if (savedId && savedId !== 'logged_out') {
        const matched = freshProfiles.find(
          (p) => p.id === savedId || p.email.toLowerCase() === savedId.toLowerCase()
        );
        if (matched && matched.id !== currentUser?.id) {
          activeUser = matched;
          setCurrentUser(matched);
        }
      }

      if (activeUser) {
        const cals = await planifikaService.getCalendarsForUser(activeUser.id, activeUser.email);
        setCalendars(cals);

        if (cals.length > 0) {
          const targetCalId = activeCalendarId && cals.some((c) => c.id === activeCalendarId) ? activeCalendarId : cals[0].id;
          setActiveCalendarId(targetCalId);

          const [perms, weekTasks, allTasks] = await Promise.all([
            planifikaService.getCalendarPermissions(targetCalId),
            planifikaService.getTasksForWeek(targetCalId, selectedWeekStart),
            planifikaService.getAllTasksForCalendar(targetCalId),
          ]);
          setPermissions(perms);
          setTasks(weekTasks);
          setAllCalendarTasks(allTasks);
        } else {
          setActiveCalendarId('');
          setPermissions([]);
          setTasks([]);
          setAllCalendarTasks([]);
        }
      }
      showToast('Lectura fresca realizada directamente en Supabase', 'success');
    } catch (e: any) {
      showToast('Error al actualizar datos: ' + (e?.message || 'Error de red'), 'error');
    } finally {
      setLoadingTasks(false);
    }
  }, [currentUser, activeCalendarId, selectedWeekStart, showToast]);

  // Switch demo user
  const switchDemoUser = useCallback(async (userId: string) => {
    const cleanId = LEGACY_USER_ID_MAP[userId] || userId;
    let user = allProfiles.find((p) => p.id === cleanId || p.id === userId) || DEMO_PROFILES.find((p) => p.id === cleanId || p.id === userId);
    if (!user) {
      const freshProfiles = await planifikaService.getProfiles();
      user = freshProfiles.find((p) => p.id === cleanId || p.id === userId);
      if (user) {
        setAllProfiles(freshProfiles);
      }
    }
    if (user) {
      localStorage.setItem('planifika_active_user_id', user.id);
      setCurrentUser(user);
      showToast(`Sesión cambiada a: ${user.full_name}`, 'info');
    }
  }, [allProfiles, showToast]);

  // Logout user and redirect to login screen
  const logout = useCallback(async () => {
    try {
      const supabase = planifikaService.getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Error al cerrar sesión de Supabase:', err);
    }
    localStorage.setItem('planifika_active_user_id', 'logged_out');
    setCurrentUser(null);
    setActiveTab('weekly');
    showToast('Has cerrado la sesión. Puedes entrar con otro usuario.', 'info');
  }, [showToast]);

  const addNewProfile = useCallback(async (profile: UserProfile) => {
    const created = await planifikaService.createProfile(profile);
    await loadProfiles();
    showToast(`Usuario ${created.full_name} añadido al sistema`, 'success');
  }, [loadProfiles, showToast]);

  const createUserWithPassword = useCallback(async (
    email: string,
    password: string,
    fullName: string,
    role: 'admin' | 'user'
  ) => {
    try {
      const res = await planifikaService.registerUser(email, password, fullName, role);
      if (res.success && res.user) {
        await loadProfiles();
        showToast(`Usuario ${res.user.full_name} (${role === 'admin' ? 'Administrador' : 'Colaborador'}) creado correctamente`, 'success');
        return { success: true };
      }
      return { success: false, error: res.error || 'Error al crear usuario' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Error al crear usuario' };
    }
  }, [loadProfiles, showToast]);

  const updateUserAccount = useCallback(async (
    userId: string,
    data: { full_name?: string; email?: string; password?: string; role?: 'admin' | 'user' }
  ) => {
    try {
      const res = await planifikaService.updateUserAccount(userId, data);
      if (res.success) {
        await loadProfiles();
        if (currentUser?.id === userId) {
          setCurrentUser((prev) => prev ? {
            ...prev,
            full_name: data.full_name || prev.full_name,
            email: data.email || prev.email,
            system_role: data.role || prev.system_role,
          } : null);
        }
        showToast('Usuario actualizado con éxito', 'success');
        return { success: true };
      }
      return { success: false, error: res.error || 'Error al actualizar usuario' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Error al actualizar usuario' };
    }
  }, [currentUser?.id, loadProfiles, showToast]);

  const deleteUserAccount = useCallback(async (userId: string) => {
    try {
      const res = await planifikaService.deleteUserAccount(userId);
      if (res.success) {
        await loadProfiles();
        showToast('Usuario eliminado del sistema', 'info');
        return { success: true };
      }
      return { success: false, error: res.error || 'Error al eliminar usuario' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Error al eliminar usuario' };
    }
  }, [loadProfiles, showToast]);

  // Load calendars for current user
  const loadCalendars = useCallback(async () => {
    if (!currentUser) {
      setCalendars([]);
      setActiveCalendarId('');
      return;
    }
    const cals = await planifikaService.getCalendarsForUser(currentUser.id, currentUser.email);
    setCalendars(cals);

    // If no active calendar or current active not in list, select first
    if (cals.length > 0) {
      setActiveCalendarId((currentActive) => {
        const exists = cals.some((c) => c.id === currentActive);
        return exists ? currentActive : cals[0].id;
      });
    } else {
      setActiveCalendarId('');
    }
  }, [currentUser?.id, currentUser?.email]);

  // Active Calendar Object
  const activeCalendar = useMemo(() => {
    return calendars.find((c) => c.id === activeCalendarId) || null;
  }, [calendars, activeCalendarId]);

  // Current Role on Active Calendar
  const currentRole: UserRole = useMemo(() => {
    if (!currentUser) return 'viewer';
    if (!activeCalendar) {
      return currentUser.system_role === 'admin' ? 'admin' : 'viewer';
    }
    // Si es propietario o administrador del sistema, siempre tiene rol admin
    if (activeCalendar.owner_id === currentUser.id || currentUser.system_role === 'admin') {
      return 'admin';
    }
    return activeCalendar.role || 'viewer';
  }, [activeCalendar, currentUser]);

  const isAdmin = currentRole === 'admin';
  const isAdminUser = currentUser?.system_role === 'admin';
  const canEdit = !!activeCalendar && (isAdmin || currentRole === 'editor');

  // Security barrier: non-admin users cannot access the settings tab
  useEffect(() => {
    if (activeTab === 'settings' && !isAdminUser && currentUser) {
      setActiveTab('weekly');
      showToast('Acceso denegado: La configuración del sistema está restringida a Administradores.', 'error');
    }
  }, [activeTab, isAdminUser, currentUser, showToast]);

  // Load Permissions
  const loadPermissions = useCallback(async () => {
    if (!activeCalendarId) {
      setPermissions([]);
      return;
    }
    const perms = await planifikaService.getCalendarPermissions(activeCalendarId);
    setPermissions(perms);
  }, [activeCalendarId]);

  // Load Tasks
  const loadTasks = useCallback(async () => {
    if (!activeCalendarId) {
      setTasks([]);
      setAllCalendarTasks([]);
      return;
    }
    setLoadingTasks(true);
    try {
      const [weekTasks, allTasks] = await Promise.all([
        planifikaService.getTasksForWeek(activeCalendarId, selectedWeekStart),
        planifikaService.getAllTasksForCalendar(activeCalendarId),
      ]);
      setTasks(weekTasks);
      setAllCalendarTasks(allTasks);
    } catch (err) {
      console.error('Error loading tasks', err);
    } finally {
      setLoadingTasks(false);
    }
  }, [activeCalendarId, selectedWeekStart]);

  // Effect: Load profiles once on mount
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Effect: Reload calendars when currentUser changes
  useEffect(() => {
    loadCalendars();
  }, [loadCalendars]);

  // Effect: When active calendar changes, reload permissions & tasks
  useEffect(() => {
    if (activeCalendarId) {
      loadPermissions();
      loadTasks();
    }
  }, [activeCalendarId, selectedWeekStart, loadPermissions, loadTasks]);

  // Effect: Auto-refresh on window focus or visibility change (no periodic background thrashing)
  useEffect(() => {
    const handleSync = () => {
      loadProfiles();
      loadCalendars();
      if (activeCalendarId) {
        loadPermissions();
        loadTasks();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleSync();
      }
    };

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadProfiles, loadCalendars, activeCalendarId, loadPermissions, loadTasks]);

  // Week navigation methods
  const goToNextWeek = useCallback(() => {
    const current = parseISODate(selectedWeekStart);
    current.setDate(current.getDate() + 7);
    setSelectedWeekStart(formatDateToISO(current));
  }, [selectedWeekStart]);

  const goToPreviousWeek = useCallback(() => {
    const current = parseISODate(selectedWeekStart);
    current.setDate(current.getDate() - 7);
    setSelectedWeekStart(formatDateToISO(current));
  }, [selectedWeekStart]);

  const goToCurrentWeek = useCallback(() => {
    const monday = getMondayOfDate(new Date());
    setSelectedWeekStart(formatDateToISO(monday));
    const dayIndex = new Date().getDay();
    const map: Record<number, DayOfWeek> = {
      0: 'domingo',
      1: 'lunes',
      2: 'martes',
      3: 'miercoles',
      4: 'jueves',
      5: 'viernes',
      6: 'sabado',
    };
    setMobileActiveDay(map[dayIndex] || 'lunes');
  }, []);

  const selectWeek = useCallback((isoDateStr: string) => {
    const monday = getMondayOfDate(parseISODate(isoDateStr));
    setSelectedWeekStart(formatDateToISO(monday));
  }, []);

  // Task Operations
  const createTask = useCallback(async (data: {
    title: string;
    description: string;
    color: TaskColorId;
    day_of_week: DayOfWeek | DayOfWeek[];
    status?: TaskStatus;
    time_estimate?: string;
  }) => {
    if (!activeCalendarId || !currentUser) {
      showToast('Selecciona un calendario primero', 'error');
      return false;
    }
    if (!canEdit) {
      showToast('No tienes permisos de edición en este calendario', 'error');
      return false;
    }

    // Enforce 20 card limit for demo users
    if (isDemoAccount(currentUser)) {
      const allCalTasks = await planifikaService.getAllTasksForCalendar(activeCalendarId);
      const daysToAddCount = Array.isArray(data.day_of_week) ? data.day_of_week.length : 1;
      if (allCalTasks.length + daysToAddCount > 20) {
        showToast(`Límite de cuenta demo: Máximo 20 tarjetas por calendario (actuales: ${allCalTasks.length}).`, 'error');
        return false;
      }
    }

    const daysList = Array.isArray(data.day_of_week) ? data.day_of_week : [data.day_of_week];

    try {
      for (const day of daysList) {
        const currentDayTasks = tasks.filter((t) => t.day_of_week === day);
        const position = currentDayTasks.length;

        await planifikaService.createTask({
          calendar_id: activeCalendarId,
          title: data.title,
          description: data.description,
          color: data.color,
          day_of_week: day,
          status: data.status || 'pending',
          week_start_date: selectedWeekStart,
          time_estimate: data.time_estimate || '',
          position,
          created_by: currentUser.id,
        });
      }

      await loadTasks();
      showToast(daysList.length > 1 ? `Tarea repetitiva creada en ${daysList.length} días` : 'Tarea creada con éxito', 'success');
      return true;
    } catch (e: any) {
      showToast(`Error al crear la tarea: ${e.message}`, 'error');
      return false;
    }
  }, [activeCalendarId, currentUser, canEdit, tasks, selectedWeekStart, loadTasks, showToast]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const res = await planifikaService.updateTask(taskId, updates, currentRole);
    if (!res.success) {
      showToast(res.error || 'Error al actualizar tarea', 'error');
      return res;
    }
    await loadTasks();
    showToast('Tarea modificada', 'success');
    return res;
  }, [currentRole, loadTasks, showToast]);

  // CRITICAL REQUIREMENT:
  // "La acción de marcar una tarea como Completada (o cambiar sus estados de completitud)
  // sólo la podrá realizar el usuario administrador del calendario. Los demás usuarios solo podrán visualizar el estado."
  const updateTaskStatus = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    if (!isAdmin) {
      showToast(
        'Acceso denegado: Sólo el Administrador del calendario puede marcar tareas como Completadas o cambiar su estado.',
        'error'
      );
      return {
        success: false,
        error: 'Sólo el Administrador puede modificar el estado de las tareas.',
      };
    }

    const res = await planifikaService.updateTask(taskId, { status: newStatus }, currentRole);
    if (!res.success) {
      showToast(res.error || 'Error al actualizar estado', 'error');
      return res;
    }
    await loadTasks();
    const statusLabel =
      newStatus === 'completed'
        ? 'Completada'
        : newStatus === 'partial'
        ? 'Completado Parcial'
        : newStatus === 'none'
        ? 'Sin estado (Nota informativa)'
        : 'Pendiente';
    showToast(`Estado actualizado a: ${statusLabel}`, 'success');
    return res;
  }, [isAdmin, currentRole, loadTasks, showToast]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!canEdit) {
      showToast('No tienes permisos para eliminar tareas', 'error');
      return false;
    }
    const res = await planifikaService.deleteTask(taskId, currentRole);
    if (!res.success) {
      showToast(res.error || 'Error al eliminar', 'error');
      return false;
    }
    await loadTasks();
    showToast('Tarea eliminada', 'info');
    return true;
  }, [canEdit, currentRole, loadTasks, showToast]);

  // Drag and Drop: Moving a task between days
  const moveTaskBetweenDays = useCallback(async (
    taskId: string,
    targetDay: DayOfWeek,
    targetIndex: number
  ) => {
    if (!canEdit) {
      showToast('Permiso denegado: Necesitas rol de Editor o Administrador para mover tareas', 'error');
      return false;
    }

    const taskToMove = tasks.find((t) => t.id === taskId);
    if (!taskToMove) return false;

    // Optimistic local state update
    const sourceDay = taskToMove.day_of_week;
    const destTasks = tasks.filter((t) => t.day_of_week === targetDay && t.id !== taskId);
    
    // Insert task at targetIndex
    destTasks.splice(targetIndex, 0, { ...taskToMove, day_of_week: targetDay });

    const updates = destTasks.map((t, idx) => ({
      id: t.id,
      day_of_week: targetDay,
      position: idx,
    }));

    // If source and target are different, also update source day positions
    if (sourceDay !== targetDay) {
      const sourceTasks = tasks
        .filter((t) => t.day_of_week === sourceDay && t.id !== taskId)
        .sort((a, b) => a.position - b.position)
        .map((t, idx) => ({
          id: t.id,
          day_of_week: sourceDay,
          position: idx,
        }));
      updates.push(...sourceTasks);
    }

    const res = await planifikaService.reorderTasks(updates, currentRole);
    if (!res.success) {
      showToast(res.error || 'Error al mover tarea', 'error');
      await loadTasks(); // rollback
      return false;
    }

    await loadTasks();
    return true;
  }, [canEdit, tasks, currentRole, loadTasks, showToast]);

  // Drag and drop: Reordering tasks within the same day
  const reorderTasksInDay = useCallback(async (
    day: DayOfWeek,
    sourceIndex: number,
    destinationIndex: number
  ) => {
    if (!canEdit) {
      showToast('Permiso denegado: Solo editores o administradores pueden reordenar tareas', 'error');
      return false;
    }

    const dayTasks = [...tasks.filter((t) => t.day_of_week === day)].sort((a, b) => a.position - b.position);
    const [moved] = dayTasks.splice(sourceIndex, 1);
    dayTasks.splice(destinationIndex, 0, moved);

    const updates = dayTasks.map((t, idx) => ({
      id: t.id,
      day_of_week: day,
      position: idx,
    }));

    const res = await planifikaService.reorderTasks(updates, currentRole);
    if (!res.success) {
      showToast(res.error || 'Error al reordenar', 'error');
      await loadTasks();
      return false;
    }
    await loadTasks();
    return true;
  }, [canEdit, tasks, currentRole, loadTasks, showToast]);

  // Calendar Management
  const createCalendar = useCallback(async (
    name: string,
    description: string,
    colorTheme: 'blue' | 'emerald' | 'indigo' | 'violet' | 'amber'
  ) => {
    if (!currentUser) throw new Error('Usuario no autenticado');

    // Limit demo / test users to only 1 calendar
    if (isDemoAccount(currentUser) && calendars.length >= 1) {
      showToast('Límite de cuenta demo: Los usuarios de prueba solo pueden tener 1 calendario.', 'error');
      throw new Error('Límite de cuenta demo: Solo se permite 1 calendario.');
    }

    if (currentUser.system_role !== 'admin') {
      showToast('Permiso denegado: Solo los usuarios con rol Administrador pueden crear calendarios.', 'error');
      throw new Error('Solo los administradores pueden crear calendarios');
    }
    try {
      const newCal = await planifikaService.createCalendar(currentUser.id, name, description, colorTheme, currentUser.email);
      await loadCalendars();
      setActiveCalendarId(newCal.id);
      showToast(`Calendario "${newCal.name}" creado con éxito. Eres el administrador.`, 'success');
      return newCal;
    } catch (err: any) {
      if (err?.message?.includes('Aviso RLS Supabase')) {
        await loadCalendars();
        const userCals = await planifikaService.getCalendarsForUser(currentUser.id, currentUser.email);
        if (userCals.length > 0) {
          setActiveCalendarId(userCals[0].id);
        }
        showToast(err.message, 'info');
        return userCals[0];
      }
      showToast(err?.message || 'Error al crear el calendario', 'error');
      throw err;
    }
  }, [currentUser, calendars.length, loadCalendars, showToast]);

  const updateCalendar = useCallback(async (id: string, updates: Partial<Calendar>) => {
    if (!isAdmin) {
      showToast('Solo el administrador puede editar el calendario', 'error');
      return;
    }
    await planifikaService.updateCalendar(id, updates);
    await loadCalendars();
    showToast('Calendario actualizado', 'success');
  }, [isAdmin, loadCalendars, showToast]);

  const deleteCalendar = useCallback(async (id: string) => {
    if (!isAdmin) {
      showToast('Solo el administrador puede eliminar el calendario', 'error');
      return;
    }
    await planifikaService.deleteCalendar(id);
    await loadCalendars();
    showToast('Calendario eliminado', 'info');
  }, [isAdmin, loadCalendars, showToast]);

  // Permissions Management
  const grantPermission = useCallback(async (userId: string, role: UserRole) => {
    if (!isAdmin || !currentUser) {
      showToast('Solo el administrador puede conceder permisos', 'error');
      return;
    }
    await planifikaService.setCalendarPermission(activeCalendarId, userId, role, currentUser.id);
    await loadPermissions();
    await loadCalendars();
    showToast('Permisos actualizados y calendario compartido con éxito', 'success');
  }, [isAdmin, currentUser, activeCalendarId, loadPermissions, loadCalendars, showToast]);

  const revokePermission = useCallback(async (userId: string, permId?: string) => {
    if (!isAdmin) {
      showToast('Solo el administrador puede revocar permisos', 'error');
      return;
    }
    await planifikaService.removeCalendarPermission(activeCalendarId, userId, permId);
    await loadPermissions();
    await loadCalendars();
    showToast('Acceso revocado correctamente', 'info');
  }, [isAdmin, activeCalendarId, loadPermissions, loadCalendars, showToast]);

  // Supabase Credentials Config
  const saveSupabaseCredentials = useCallback(async (url: string, key: string) => {
    const res = await planifikaService.setCredentials(url, key);
    setIsLiveConnected(planifikaService.isConnectedToSupabase());
    setSupabaseCredentials(planifikaService.getCredentials());
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      await loadCalendars();
    }
    return res;
  }, [loadCalendars, showToast]);

  const resetDemoData = useCallback(() => {
    planifikaService.resetLocalDatabase();
    loadProfiles();
    loadCalendars();
    showToast('Base de datos demo restaurada a valores iniciales', 'info');
  }, [loadProfiles, loadCalendars, showToast]);

  // Modal open helpers
  const openCreateTaskModal = useCallback((defaultDay: DayOfWeek = 'lunes') => {
    if (!canEdit) {
      showToast('Permiso de solo lectura: no puedes crear tareas en este calendario', 'error');
      return;
    }
    setTaskToEdit(null);
    setTaskDefaultDay(defaultDay);
    setIsTaskModalOpen(true);
  }, [canEdit, showToast]);

  const openEditTaskModal = useCallback((task: Task) => {
    if (!canEdit) {
      showToast('Permiso de solo lectura: no puedes modificar tareas', 'error');
      return;
    }
    setTaskToEdit(task);
    setTaskDefaultDay(task.day_of_week);
    setIsTaskModalOpen(true);
  }, [canEdit, showToast]);

  const closeTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setTaskToEdit(null);
  }, []);

  const openPermissionsModal = useCallback(() => {
    if (!isAdmin) {
      showToast('Solo el administrador del calendario puede gestionar permisos', 'error');
      return;
    }
    loadProfiles();
    loadPermissions();
    setIsPermissionsModalOpen(true);
  }, [isAdmin, loadProfiles, loadPermissions, showToast]);

  const closePermissionsModal = useCallback(() => {
    setIsPermissionsModalOpen(false);
  }, []);

  const openCalendarModal = useCallback(() => {
    setIsCalendarModalOpen(true);
  }, []);

  const closeCalendarModal = useCallback(() => {
    setIsCalendarModalOpen(false);
  }, []);

  const openSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  const closeSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);

  const value = {
    currentUser,
    setCurrentUser,
    switchDemoUser,
    logout,
    allProfiles,
    loadProfiles,
    addNewProfile,
    createUserWithPassword,
    updateUserAccount,
    deleteUserAccount,
    calendars,
    activeCalendar,
    setActiveCalendarId,
    currentRole,
    isAdmin,
    isAdminUser,
    canEdit,
    currentWeekInfo,
    selectedWeekStart,
    goToNextWeek,
    goToPreviousWeek,
    goToCurrentWeek,
    selectWeek,
    tasks,
    allCalendarTasks,
    loadingTasks,
    mobileActiveDay,
    setMobileActiveDay,
    viewMode,
    setViewMode,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    moveTaskBetweenDays,
    reorderTasksInDay,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    permissions,
    loadPermissions,
    grantPermission,
    revokePermission,
    activeTab,
    setActiveTab,
    isTaskModalOpen,
    taskToEdit,
    taskDefaultDay,
    openCreateTaskModal,
    openEditTaskModal,
    closeTaskModal,
    isPermissionsModalOpen,
    openPermissionsModal,
    closePermissionsModal,
    isCalendarModalOpen,
    openCalendarModal,
    closeCalendarModal,
    isSettingsModalOpen,
    openSettingsModal,
    closeSettingsModal,
    toast,
    showToast,
    isLiveConnected,
    supabaseCredentials,
    saveSupabaseCredentials,
    resetDemoData,
    refreshAllData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
